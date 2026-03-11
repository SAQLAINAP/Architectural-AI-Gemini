import json, time, os, sys
from openai import OpenAI
from validators import check_vaastu, check_regulatory, compute_spatial_efficiency

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

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

def call_llm(prompt_text, model="gpt-4o"):
    start = time.time()
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role":"system","content":SYSTEM_PROMPT},
            {"role":"user","content":prompt_text}
        ],
        response_format={"type":"json_object"},
        max_tokens=2000
    )
    elapsed = time.time() - start
    content = resp.choices[0].message.content
    tokens_in = resp.usage.prompt_tokens
    tokens_out = resp.usage.completion_tokens
    return content, elapsed, tokens_in, tokens_out

results = {"baseline_1":[], "baseline_2":[]}

for idx, item in enumerate(corpus):
    print(f"  [{idx+1}/{len(corpus)}] {item['id']} {item['category']}")

    # -- BASELINE 1: Single-Shot --
    try:
        raw, gt, tok_in, tok_out = call_llm(item["prompt"])
        plan = json.loads(raw)
        cv_score, cv_cnt, cv_viol = check_vaastu(plan, item.get("vaastu_required",False))
        cr_score, cr_cnt, cr_viol = check_regulatory(plan, item.get("jurisdiction","NBC"))
        se = compute_spatial_efficiency(plan, item)
        csr = (0.4*cr_score + 0.3*cv_score + 0.2*se) * 100
        results["baseline_1"].append({
            "id": item["id"], "category": item["category"],
            "jurisdiction": item.get("jurisdiction"),
            "vaastu_required": item.get("vaastu_required",False),
            "room_count": len(plan.get("rooms",[])),
            "csr": round(csr,2),
            "se": round(se*100,2),
            "vc": cv_cnt + cr_cnt,
            "violations": cv_viol + cr_viol,
            "gt_seconds": round(gt,2),
            "tokens_in": tok_in, "tokens_out": tok_out
        })
        print(f"    B1: csr={csr:.1f} se={se*100:.1f} vc={cv_cnt+cr_cnt} gt={gt:.1f}s")
    except Exception as e:
        print(f"    B1 ERROR: {e}")
        results["baseline_1"].append({"id":item["id"],"error":str(e)})

    # -- BASELINE 2: LLM + Post-Hoc Validation (no refinement) --
    try:
        raw, gt, tok_in, tok_out = call_llm(item["prompt"])
        plan = json.loads(raw)
        cv_score, cv_cnt, cv_viol = check_vaastu(plan, item.get("vaastu_required",False))
        cr_score, cr_cnt, cr_viol = check_regulatory(plan, item.get("jurisdiction","NBC"))
        se = compute_spatial_efficiency(plan, item)
        csr = (0.4*cr_score + 0.3*cv_score + 0.2*se) * 100
        results["baseline_2"].append({
            "id": item["id"], "category": item["category"],
            "jurisdiction": item.get("jurisdiction"),
            "vaastu_required": item.get("vaastu_required",False),
            "room_count": len(plan.get("rooms",[])),
            "csr": round(csr,2),
            "se": round(se*100,2),
            "vc": cv_cnt + cr_cnt,
            "violations_flagged": cv_viol + cr_viol,
            "gt_seconds": round(gt,2),
            "tokens_in": tok_in, "tokens_out": tok_out
        })
        print(f"    B2: csr={csr:.1f} se={se*100:.1f} vc={cv_cnt+cr_cnt} gt={gt:.1f}s")
    except Exception as e:
        print(f"    B2 ERROR: {e}")
        results["baseline_2"].append({"id":item["id"],"error":str(e)})

    # Save progress every 10 items
    if (idx + 1) % 10 == 0:
        with open("baseline_results.json","w") as f:
            json.dump(results, f, indent=2)
        print(f"  [checkpoint saved at {idx+1}]")

with open("baseline_results.json","w") as f:
    json.dump(results, f, indent=2)
print(f"Baselines done -> baseline_results.json ({len(results['baseline_1'])} B1, {len(results['baseline_2'])} B2)")
