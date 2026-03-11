import json
import numpy as np

def load(f):
    with open(f) as fp: return json.load(fp)

b1 = load("baseline_results.json")["baseline_1"]
b2 = load("baseline_results.json")["baseline_2"]
prop = load("proposed_results.json")
model_bench = load("model_bench_results.json")
img_scored = load("imagegen_scored.json")

def safe_mean(lst):
    lst = [x for x in lst if x is not None]
    return round(float(np.mean(lst)),2) if lst else None
def safe_std(lst):
    lst = [x for x in lst if x is not None]
    return round(float(np.std(lst)),2) if lst else None

cats = ["residential_single","residential_multi","commercial_office","culturally_constrained"]
juris = ["NBC","BBMP","BMC","MCD"]

# -- PRIMARY METRICS --
def get_csrs(data, field="csr"):
    return [r[field] for r in data if field in r and "error" not in r]

def per_category(data, field="csr"):
    return {c: safe_mean([r[field] for r in data
                          if r.get("category")==c and field in r and "error" not in r]) for c in cats}

# Convergence
converge_at = [r.get("converged_at") for r in prop if r.get("converged")]
n = max(len(prop), 1)
conv_dist = {
    "iteration_1_pct": round(sum(1 for x in converge_at if x==1)/n*100,1),
    "iteration_2_pct": round(sum(1 for x in converge_at if x==2)/n*100,1),
    "iteration_3_pct": round(sum(1 for x in converge_at if x==3)/n*100,1),
    "non_converged_pct": round(sum(1 for r in prop if not r.get("converged"))/n*100,1),
}

# Score per iteration
def mean_score_at_iter(iteration):
    scores = []
    for r in prop:
        iters = r.get("iterations",[])
        matching = [i["score"] for i in iters if i["iteration"]==iteration]
        if matching: scores.append(matching[0])
    return safe_mean(scores)

# Delta S
all_deltas = []
for r in prop:
    hist = r.get("score_history",[])
    for i in range(1,len(hist)):
        all_deltas.append(hist[i]-hist[i-1])

# Violation type distribution
vtype_counts = {
    "vaastu_directional":0,"vaastu_proportional":0,"regulatory_egress":0,
    "regulatory_area":0,"regulatory_setback":0,"spatial_adjacency":0,"spatial_efficiency":0
}
for r in prop:
    for v in r.get("all_violations",[]):
        vl = v.lower()
        if "vaastu" in vl and any(k in vl for k in ["kitchen","entrance","bedroom","pooja","living","dining","stairs","slope","water","garage","bathroom"]):
            vtype_counts["vaastu_directional"] += 1
        elif "vaastu" in vl and any(k in vl for k in ["proportion","size","ratio","center","open"]):
            vtype_counts["vaastu_proportional"] += 1
        elif "regulatory" in vl and "egress" in vl:
            vtype_counts["regulatory_egress"] += 1
        elif "regulatory" in vl and "area" in vl:
            vtype_counts["regulatory_area"] += 1
        elif "regulatory" in vl and ("setback" in vl or "total_area" in vl or "parking" in vl or "bathroom" in vl):
            vtype_counts["regulatory_setback"] += 1
        elif "spatial" in vl and "adjacency" in vl:
            vtype_counts["spatial_adjacency"] += 1
        elif "spatial" in vl and "efficiency" in vl:
            vtype_counts["spatial_efficiency"] += 1
        elif "vaastu" in vl:
            vtype_counts["vaastu_directional"] += 1
        elif "regulatory" in vl:
            vtype_counts["regulatory_area"] += 1

total_v = max(sum(vtype_counts.values()),1)

# Refinement fix rate per iteration
fix_rates = {1:[], 2:[], 3:[]}
for r in prop:
    for it in r.get("iterations",[]):
        idx = it["iteration"]+1
        if idx in fix_rates and "fix_rate" in it:
            fix_rates[idx].append(it["fix_rate"])

# Critic dimensions
def mean_critic_dim(dim):
    scores = []
    for r in prop:
        if r.get("critic_dims") and dim in r["critic_dims"]:
            val = r["critic_dims"][dim]
            if isinstance(val, (int, float)):
                scores.append(val)
    return safe_mean(scores)

# Per-jurisdiction
def juris_metrics(jurisdiction):
    rows = [r for r in prop if r.get("jurisdiction")==jurisdiction]
    return {
        "mean_csr": safe_mean([r.get("final_csr") for r in rows if r.get("final_csr") is not None]),
        "mean_vc":  safe_mean([r.get("final_vc")  for r in rows if r.get("final_vc") is not None])
    }

# Complexity groups
def complexity_group(room_count):
    if room_count<=3: return "rooms_2_3"
    if room_count<=5: return "rooms_4_5"
    if room_count<=8: return "rooms_6_8"
    return "rooms_9_plus"

complexity = {"rooms_2_3":{"csrs":[],"gts":[]},"rooms_4_5":{"csrs":[],"gts":[]},
              "rooms_6_8":{"csrs":[],"gts":[]},"rooms_9_plus":{"csrs":[],"gts":[]}}
for r in prop:
    g = complexity_group(r.get("room_count",0))
    if r.get("final_csr") is not None: complexity[g]["csrs"].append(r["final_csr"])
    if r.get("total_gt") is not None:  complexity[g]["gts"].append(r["total_gt"])

# Vaastu vs non-Vaastu
vaastu_rows     = [r for r in prop if r.get("vaastu_required")]
non_vaastu_rows = [r for r in prop if not r.get("vaastu_required")]

# Model benchmark aggregation
model_results = {}
for model in ["gpt-4o","gpt-4o-mini","gpt-4.1",
              "gemini-2.5-pro","gemini-2.5-flash","llama-3.3-70b"]:
    rows = [r for r in model_bench if r["model"]==model]
    if not rows:
        continue
    model_results[model] = {
        "parse_success_pct": round(sum(1 for r in rows if r.get("parse_success"))/max(len(rows),1)*100,1),
        "mean_latency_s":    safe_mean([r["latency_s"] for r in rows]),
        "mean_cost_usd":     safe_mean([r["cost_usd"] for r in rows]),
        "mean_room_count":   safe_mean([r["room_count"] for r in rows if r.get("parse_success")])
    }

# Image scores
img_by_model = {}
for r in img_scored:
    m = r.get("model","unknown")
    if m not in img_by_model: img_by_model[m] = []
    if r.get("scores"):
        s = r["scores"]
        avg = safe_mean([s.get(k,0) for k in
            ["room_labeling","spatial_proportionality","adjacency_correctness",
             "drawing_style","deployment_readiness"]])
        if avg is not None:
            img_by_model[m].append(avg)
img_mean_fidelity = {m: safe_mean(v) for m,v in img_by_model.items() if v}

# -- ASSEMBLE OUTPUT --
metrics = {
    "primary_metrics": {
        "constraint_satisfaction_rate": {
            "baseline_single_shot": {"mean":safe_mean(get_csrs(b1)),"std":safe_std(get_csrs(b1))},
            "baseline_posthoc":     {"mean":safe_mean(get_csrs(b2)),"std":safe_std(get_csrs(b2))},
            "proposed":             {"mean":safe_mean(get_csrs(prop,"final_csr")),
                                     "std": safe_std(get_csrs(prop,"final_csr"))},
            "per_category": {
                c: {
                    "baseline_single_shot": per_category(b1,"csr")[c],
                    "baseline_posthoc":     per_category(b2,"csr")[c],
                    "proposed":             per_category(prop,"final_csr")[c]
                } for c in cats
            }
        },
        "spatial_efficiency": {
            "baseline_single_shot": {"mean":safe_mean(get_csrs(b1,"se")),"std":safe_std(get_csrs(b1,"se"))},
            "baseline_posthoc":     {"mean":safe_mean(get_csrs(b2,"se")),"std":safe_std(get_csrs(b2,"se"))},
            "proposed":             {"mean":safe_mean(get_csrs(prop,"final_se")),
                                     "std": safe_std(get_csrs(prop,"final_se"))}
        },
        "violation_count": {
            "baseline_single_shot": {"mean":safe_mean(get_csrs(b1,"vc")),"std":safe_std(get_csrs(b1,"vc"))},
            "baseline_posthoc":     {"mean":safe_mean(get_csrs(b2,"vc")),"std":safe_std(get_csrs(b2,"vc"))},
            "proposed":             {"mean":safe_mean(get_csrs(prop,"final_vc")),
                                     "std": safe_std(get_csrs(prop,"final_vc"))}
        },
        "iteration_improvement": {
            "mean_delta_s": safe_mean(all_deltas),
            "convergence_distribution": conv_dist,
            "mean_score_per_iteration": {
                "iter_0": mean_score_at_iter(0),
                "iter_1": mean_score_at_iter(1),
                "iter_2": mean_score_at_iter(2),
                "iter_3": mean_score_at_iter(3),
            }
        },
        "generation_time_seconds": {
            "baseline_single_shot": {"mean":safe_mean(get_csrs(b1,"gt_seconds")),"std":safe_std(get_csrs(b1,"gt_seconds"))},
            "baseline_posthoc":     {"mean":safe_mean(get_csrs(b2,"gt_seconds")),"std":safe_std(get_csrs(b2,"gt_seconds"))},
            "proposed":             {"mean":safe_mean(get_csrs(prop,"total_gt")),
                                     "std": safe_std(get_csrs(prop,"total_gt"))},
            "proposed_phase_breakdown": {
                "phase1_mean": safe_mean([r["phase_times"]["phase1"] for r in prop if "phase_times" in r and "phase1" in r.get("phase_times",{})]),
                "phase2_mean": safe_mean([r["phase_times"]["phase2"] for r in prop if "phase_times" in r and "phase2" in r.get("phase_times",{})]),
                "phase3_mean": safe_mean([r["phase_times"]["phase3"] for r in prop if "phase_times" in r and "phase3" in r.get("phase_times",{})]),
            }
        }
    },
    "secondary_metrics": {
        "violation_type_distribution": {
            k: {"count":v,"pct":round(v/total_v*100,1)} for k,v in vtype_counts.items()
        },
        "refinement_effectiveness": {
            f"iteration_{k}": {"mean_fix_rate_pct": safe_mean(v)}
            for k,v in fix_rates.items()
        },
        "critic_dimension_scores": {
            dim: mean_critic_dim(dim) for dim in
            ["functionality","circulation","natural_light","privacy","proportion","cultural_sensitivity"]
        },
        "per_jurisdiction_csr": {j: juris_metrics(j) for j in juris},
        "complexity_vs_performance": {
            g: {"mean_csr": safe_mean(complexity[g]["csrs"]),
                "mean_gt":  safe_mean(complexity[g]["gts"])} for g in complexity
        },
        "vaastu_vs_non_vaastu": {
            "vaastu_required":     {
                "mean_csr": safe_mean([r.get("final_csr") for r in vaastu_rows if r.get("final_csr") is not None]),
                "mean_vc":  safe_mean([r.get("final_vc")  for r in vaastu_rows if r.get("final_vc") is not None]),
                "mean_gt":  safe_mean([r.get("total_gt")  for r in vaastu_rows if r.get("total_gt") is not None])
            },
            "vaastu_not_required": {
                "mean_csr": safe_mean([r.get("final_csr") for r in non_vaastu_rows if r.get("final_csr") is not None]),
                "mean_vc":  safe_mean([r.get("final_vc")  for r in non_vaastu_rows if r.get("final_vc") is not None]),
                "mean_gt":  safe_mean([r.get("total_gt")  for r in non_vaastu_rows if r.get("total_gt") is not None])
            }
        },
        "model_benchmark": model_results,
        "image_fidelity_scores": img_mean_fidelity
    }
}

with open("all_metrics.json","w") as f:
    json.dump(metrics, f, indent=2)
print("All metrics computed -> all_metrics.json")
