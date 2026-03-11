import json, time, os
from openai import OpenAI
from validators import check_vaastu, check_regulatory, compute_spatial_efficiency

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

CRITIC_PROMPT = """Evaluate this floor plan JSON on exactly 6 dimensions.
Return ONLY JSON:
{{
  "functionality": float 0-1,
  "circulation": float 0-1,
  "natural_light": float 0-1,
  "privacy": float 0-1,
  "proportion": float 0-1,
  "cultural_sensitivity": float 0-1,
  "notes": str
}}
Floor plan: {plan}"""

REFINEMENT_PROMPT = """You are a floor plan refinement agent.
Given the current plan and a list of violations, produce a corrected plan.
Fix ONLY the violations listed. Do not change compliant rooms.
Violations to fix: {violations}
Current plan: {plan}
Return ONLY corrected JSON in the same schema as the input plan."""

def call_llm(prompt, model="gpt-4o", temp=0.7, max_tok=2000):
    start = time.time()
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role":"user","content":prompt}],
        temperature=temp,
        response_format={"type":"json_object"},
        max_tokens=max_tok
    )
    return (resp.choices[0].message.content, time.time()-start,
            resp.usage.prompt_tokens, resp.usage.completion_tokens)

def critic_score(plan_json):
    prompt = CRITIC_PROMPT.format(plan=json.dumps(plan_json))
    raw, _, _, _ = call_llm(prompt, model="gpt-4o", temp=0.3)
    scores = json.loads(raw)
    dims = ["functionality","circulation","natural_light","privacy",
            "proportion","cultural_sensitivity"]
    critic_mean = sum(scores.get(k, 0.5) for k in dims) / 6
    return critic_mean, scores

def composite_score(cr_score, cv_score, se, critic_mean):
    return 0.4*cr_score + 0.3*cv_score + 0.2*se + 0.1*critic_mean

SYSTEM_PROMPT = """You are an architectural floor plan generator.
Given a specification, return a JSON floor plan with this structure:
{
  "rooms": [{"name": str, "area_sqft": int, "orientation": str,
             "adjacent_to": [str], "zone": str}],
  "total_area_sqft": int,
  "plot_dimensions": {"length_ft": int, "width_ft": int},
  "vaastu_compliant": bool,
  "egress_paths": [str],
  "regulatory_notes": str
}
Return ONLY valid JSON. No markdown fences."""

with open("corpus.json") as f:
    corpus = json.load(f)

THRESHOLD = 0.70
MAX_ITER  = 3
proposed  = []

for idx, item in enumerate(corpus):
    print(f"  [{idx+1}/{len(corpus)}] {item['id']} {item['category']}")
    rec = {"id": item["id"], "category": item["category"],
           "jurisdiction": item.get("jurisdiction"),
           "vaastu_required": item.get("vaastu_required",False),
           "iterations": [], "phase_times": {}}
    t_total_start = time.time()

    # -- PHASE 1: Input normalization + spatial generation --
    p1_start = time.time()
    try:
        # Input agent (smaller model)
        input_resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role":"user","content":
                f"Normalize this architectural request into structured JSON spec: {item['prompt']}\n"
                f"Return JSON with: rooms_required, plot_dimensions, constraints, jurisdiction, vaastu_required"}],
            temperature=0.2,
            response_format={"type":"json_object"},
            max_tokens=1000
        )
        spec = json.loads(input_resp.choices[0].message.content)
    except:
        spec = {"prompt": item["prompt"]}

    # Spatial agent (larger model)
    spatial_prompt = (
        f"Generate a detailed architectural floor plan JSON for: "
        f"{json.dumps(spec)}\n"
        f"Original request: {item['prompt']}\n"
        f"Return JSON with rooms array (each with name, area_sqft, orientation, adjacent_to, zone), "
        f"total_area_sqft, plot_dimensions (length_ft, width_ft), "
        f"vaastu_compliant, egress_paths, regulatory_notes."
    )
    raw, _, _, _ = call_llm(spatial_prompt, model="gpt-4o", temp=0.7)
    plan = json.loads(raw)
    rec["phase_times"]["phase1"] = round(time.time()-p1_start, 2)
    rec["room_count"] = len(plan.get("rooms",[]))

    # -- PHASE 2: Iterative refinement loop --
    p2_start = time.time()
    score_history = []
    all_violations = []

    for iteration in range(MAX_ITER):
        cv_score, cv_cnt, cv_viol = check_vaastu(plan, item.get("vaastu_required",False))
        cr_score_v, cr_cnt, cr_viol = check_regulatory(plan, item.get("jurisdiction","NBC"))
        se = compute_spatial_efficiency(plan, item)
        critic_mean, critic_dims = critic_score(plan)
        score = composite_score(cr_score_v, cv_score, se, critic_mean)
        all_violations.extend(cv_viol + cr_viol)

        iter_record = {
            "iteration": iteration,
            "score": round(score,4),
            "csr": round((0.4*cr_score_v + 0.3*cv_score + 0.2*se)*100, 2),
            "vc_before": cv_cnt + cr_cnt,
            "se": round(se*100,2),
            "critic_dims": critic_dims,
            "violations": cv_viol + cr_viol
        }

        if score >= THRESHOLD:
            iter_record["converged"] = True
            rec["iterations"].append(iter_record)
            score_history.append(score)
            print(f"    iter={iteration} score={score:.3f} CONVERGED")
            break

        # Refinement
        ref_prompt = REFINEMENT_PROMPT.format(
            violations=json.dumps(cv_viol + cr_viol),
            plan=json.dumps(plan)
        )
        try:
            raw, _, _, _ = call_llm(ref_prompt, model="gpt-4o", temp=0.5)
            plan_new = json.loads(raw)
        except:
            plan_new = plan  # Keep current if refinement fails

        # Count violations after refinement
        cv2, cv_cnt2, _ = check_vaastu(plan_new, item.get("vaastu_required",False))
        cr2, cr_cnt2, _ = check_regulatory(plan_new, item.get("jurisdiction","NBC"))
        iter_record["vc_after"] = cv_cnt2 + cr_cnt2
        iter_record["fix_rate"] = round(
            (iter_record["vc_before"] - iter_record["vc_after"]) /
            max(iter_record["vc_before"],1) * 100, 1)

        rec["iterations"].append(iter_record)
        score_history.append(score)
        plan = plan_new
        print(f"    iter={iteration} score={score:.3f} vc={iter_record['vc_before']}->{iter_record['vc_after']}")

    rec["phase_times"]["phase2"] = round(time.time()-p2_start, 2)
    rec["score_history"] = score_history
    rec["converged"] = any(i.get("converged") for i in rec["iterations"])
    rec["converged_at"] = next(
        (i["iteration"]+1 for i in rec["iterations"] if i.get("converged")), None)

    # Final metrics
    final_iter = rec["iterations"][-1]
    rec["final_csr"]  = final_iter["csr"]
    rec["final_vc"]   = final_iter.get("vc_after", final_iter["vc_before"])
    rec["final_se"]   = final_iter["se"]
    rec["final_score"]= final_iter["score"]
    rec["critic_dims"]= final_iter["critic_dims"]
    rec["all_violations"] = all_violations

    # -- PHASE 3: Cost + Furniture --
    p3_start = time.time()
    try:
        cost_prompt = f"Generate a bill of materials and cost estimate for this floor plan: {json.dumps(plan)}\nReturn JSON."
        call_llm(cost_prompt, model="gpt-4o-mini", temp=0.2)
        furn_prompt = f"Suggest furniture placement for this floor plan: {json.dumps(plan)}\nReturn JSON."
        call_llm(furn_prompt, model="gpt-4o-mini", temp=0.4)
    except:
        pass
    rec["phase_times"]["phase3"] = round(time.time()-p3_start, 2)
    rec["total_gt"] = round(time.time()-t_total_start, 2)

    proposed.append(rec)
    print(f"    => score={rec['final_score']:.3f} vc={rec['final_vc']} "
          f"converged={rec['converged']} gt={rec['total_gt']}s")

    # Save progress every 10 items
    if (idx + 1) % 10 == 0:
        with open("proposed_results.json","w") as f:
            json.dump(proposed, f, indent=2)
        print(f"  [checkpoint saved at {idx+1}]")

with open("proposed_results.json","w") as f:
    json.dump(proposed, f, indent=2)
print(f"Proposed pipeline done -> proposed_results.json ({len(proposed)} plans)")
