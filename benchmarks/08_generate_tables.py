import json, os
os.makedirs("tables", exist_ok=True)

with open("all_metrics.json") as f:
    m = json.load(f)

pm = m["primary_metrics"]
sm = m["secondary_metrics"]

def fmt(v, decimals=1):
    if v is None: return "—"
    return f"{v:.{decimals}f}"

# -- TABLE 1: Primary Metrics Comparison --
with open("tables/table1_primary_metrics.md","w") as f:
    csr = pm["constraint_satisfaction_rate"]
    se  = pm["spatial_efficiency"]
    vc  = pm["violation_count"]
    ii  = pm["iteration_improvement"]
    gt  = pm["generation_time_seconds"]
    f.write("# Table 1 — Performance Comparison Across Methods\n\n")
    f.write("| Method | CSR (%) | SE (%) | VC | ΔS | GT (s) |\n")
    f.write("|--------|---------|--------|----|----|--------|\n")
    f.write(f"| Single-Shot LLM | {fmt(csr['baseline_single_shot']['mean'])} ± {fmt(csr['baseline_single_shot']['std'])} "
            f"| {fmt(se['baseline_single_shot']['mean'])} | {fmt(vc['baseline_single_shot']['mean'])} "
            f"| — | {fmt(gt['baseline_single_shot']['mean'])} |\n")
    f.write(f"| LLM + Post-Hoc Val. | {fmt(csr['baseline_posthoc']['mean'])} ± {fmt(csr['baseline_posthoc']['std'])} "
            f"| {fmt(se['baseline_posthoc']['mean'])} | {fmt(vc['baseline_posthoc']['mean'])} "
            f"| — | {fmt(gt['baseline_posthoc']['mean'])} |\n")
    f.write(f"| **Proposed System** | **{fmt(csr['proposed']['mean'])} ± {fmt(csr['proposed']['std'])}** "
            f"| **{fmt(se['proposed']['mean'])}** | **{fmt(vc['proposed']['mean'])}** "
            f"| **{fmt(ii['mean_delta_s'],3)}** | {fmt(gt['proposed']['mean'])} |\n")
    f.write(f"\n_CSR = Constraint Satisfaction Rate · SE = Spatial Efficiency · "
            f"VC = Mean Violation Count · ΔS = Mean Score Improvement per Iteration · GT = Generation Time_\n")
print("  table1_primary_metrics.md")

# -- TABLE 2: CSR by Category --
with open("tables/table2_csr_by_category.md","w") as f:
    csr = pm["constraint_satisfaction_rate"]
    vc  = pm["violation_count"]
    f.write("# Table 2 — CSR by Prompt Category\n\n")
    f.write("| Category | Single-Shot (%) | Post-Hoc Val. (%) | Proposed (%) | Mean VC |\n")
    f.write("|----------|-----------------|-------------------|--------------|----------|\n")
    cats_display = {
        "residential_single": "Residential Single-Floor",
        "residential_multi": "Residential Multi-Room",
        "commercial_office": "Commercial Office",
        "culturally_constrained": "Culturally Constrained"
    }
    per_cat = csr["per_category"]
    for cat_key, cat_label in cats_display.items():
        b1v = per_cat.get(cat_key,{}).get("baseline_single_shot")
        b2v = per_cat.get(cat_key,{}).get("baseline_posthoc")
        pv  = per_cat.get(cat_key,{}).get("proposed")
        f.write(f"| {cat_label} | {fmt(b1v)} | {fmt(b2v)} | **{fmt(pv)}** | — |\n")
    f.write(f"| **Overall** | **{fmt(csr['baseline_single_shot']['mean'])}** "
            f"| **{fmt(csr['baseline_posthoc']['mean'])}** "
            f"| **{fmt(csr['proposed']['mean'])}** | **{fmt(vc['proposed']['mean'])}** |\n")
print("  table2_csr_by_category.md")

# -- TABLE 3: Convergence Distribution --
with open("tables/table3_convergence.md","w") as f:
    ii = pm["iteration_improvement"]
    cd = ii["convergence_distribution"]
    sp = ii["mean_score_per_iteration"]
    f.write("# Table 3 — Convergence Distribution and Score Progression\n\n")
    f.write("## Convergence Distribution\n\n")
    f.write("| Convergence Point | % of Plans |\n")
    f.write("|-------------------|------------|\n")
    f.write(f"| Iteration 1 (Early) | {fmt(cd.get('iteration_1_pct'))}% |\n")
    f.write(f"| Iteration 2 (Mid)   | {fmt(cd.get('iteration_2_pct'))}% |\n")
    f.write(f"| Iteration 3 (Late)  | {fmt(cd.get('iteration_3_pct'))}% |\n")
    f.write(f"| Non-Converged       | {fmt(cd.get('non_converged_pct'))}% |\n")
    f.write("\n## Mean Compliance Score per Iteration\n\n")
    f.write("| Iteration | Mean Composite Score |\n")
    f.write("|-----------|----------------------|\n")
    for k, label in [("iter_0","Iter 0 (Initial)"),("iter_1","Iter 1"),
                     ("iter_2","Iter 2"),("iter_3","Iter 3")]:
        f.write(f"| {label} | {fmt(sp.get(k),3)} |\n")
print("  table3_convergence.md")

# -- TABLE 4: Generation Time Phase Breakdown --
with open("tables/table4_generation_time.md","w") as f:
    gt = pm["generation_time_seconds"]
    pb = gt["proposed_phase_breakdown"]
    f.write("# Table 4 — Generation Time Breakdown\n\n")
    f.write("| Phase | Mean Time (s) | Description |\n")
    f.write("|-------|---------------|-------------|\n")
    f.write(f"| Phase 1 | {fmt(pb.get('phase1_mean'))} | Input normalization + spatial generation |\n")
    f.write(f"| Phase 2 | {fmt(pb.get('phase2_mean'))} | Iterative validation + refinement loop |\n")
    f.write(f"| Phase 3 | {fmt(pb.get('phase3_mean'))} | Cost estimation + furniture placement |\n")
    f.write(f"| **Total (Proposed)** | **{fmt(gt['proposed']['mean'])} ± {fmt(gt['proposed']['std'])}** | Full pipeline |\n")
    f.write(f"| Baseline 1 (Single-Shot) | {fmt(gt['baseline_single_shot']['mean'])} ± {fmt(gt['baseline_single_shot']['std'])} | Single call |\n")
    f.write(f"| Baseline 2 (Post-Hoc)    | {fmt(gt['baseline_posthoc']['mean'])} ± {fmt(gt['baseline_posthoc']['std'])} | Single call + validation |\n")
print("  table4_generation_time.md")

# -- TABLE 5: Violation Type Distribution --
with open("tables/table5_violation_types.md","w") as f:
    f.write("# Table 5 — Violation Type Distribution (Proposed System)\n\n")
    f.write("| Violation Type | Count | % of Total |\n")
    f.write("|----------------|-------|------------|\n")
    vtd = sm["violation_type_distribution"]
    labels = {
        "vaastu_directional":  "Vaastu — Room in Wrong Zone",
        "vaastu_proportional": "Vaastu — Room Size Ratio",
        "regulatory_egress":   "Regulatory — Egress Path",
        "regulatory_area":     "Regulatory — Minimum Area",
        "regulatory_setback":  "Regulatory — Setback Distance",
        "spatial_adjacency":   "Spatial — Adjacency Violation",
        "spatial_efficiency":  "Spatial — Area Ratio Below Threshold"
    }
    for k, label in labels.items():
        v = vtd.get(k,{})
        f.write(f"| {label} | {v.get('count','—')} | {fmt(v.get('pct'))}% |\n")
print("  table5_violation_types.md")

# -- TABLE 6: Refinement Effectiveness --
with open("tables/table6_refinement_effectiveness.md","w") as f:
    f.write("# Table 6 — Refinement Agent Fix Rate per Iteration\n\n")
    f.write("| Iteration | Mean Fix Rate (%) | Interpretation |\n")
    f.write("|-----------|-------------------|----------------|\n")
    re_data = sm["refinement_effectiveness"]
    interps = {1:"First-pass targeted corrections",
               2:"Residual violation cleanup",
               3:"Hard constraint conflict resolution"}
    for i in [1,2,3]:
        rate = re_data.get(f"iteration_{i}",{}).get("mean_fix_rate_pct")
        f.write(f"| Iteration {i} | {fmt(rate)} | {interps[i]} |\n")
print("  table6_refinement_effectiveness.md")

# -- TABLE 7: Critic Dimension Scores --
with open("tables/table7_critic_scores.md","w") as f:
    f.write("# Table 7 — Critic Agent Dimension Scores (Proposed System)\n\n")
    f.write("| Dimension | Mean Score (0–1) | Description |\n")
    f.write("|-----------|-----------------|-------------|\n")
    cds = sm["critic_dimension_scores"]
    dim_desc = {
        "functionality":        "Rooms serve their intended purpose",
        "circulation":          "Movement flow between spaces",
        "natural_light":        "Window placement and orientation",
        "privacy":              "Bedroom/bathroom separation from public zones",
        "proportion":           "Room size relative to function",
        "cultural_sensitivity": "Contextual and cultural appropriateness"
    }
    for dim, desc in dim_desc.items():
        f.write(f"| {dim.replace('_',' ').title()} | {fmt(cds.get(dim),3)} | {desc} |\n")
print("  table7_critic_scores.md")

# -- TABLE 8: Per-Jurisdiction CSR --
with open("tables/table8_jurisdiction.md","w") as f:
    f.write("# Table 8 — CSR and Violation Count by Jurisdiction (Proposed System)\n\n")
    f.write("| Jurisdiction | Mean CSR (%) | Mean VC | Notes |\n")
    f.write("|--------------|--------------|---------|-------|\n")
    jur_notes = {
        "NBC":  "National Building Code — broadest applicability",
        "BBMP": "Bruhat Bengaluru Mahanagara Palike",
        "BMC":  "Brihanmumbai Municipal Corporation",
        "MCD":  "Municipal Corporation of Delhi"
    }
    pj = sm["per_jurisdiction_csr"]
    for jur, note in jur_notes.items():
        j = pj.get(jur,{})
        f.write(f"| {jur} | {fmt(j.get('mean_csr'))} | {fmt(j.get('mean_vc'))} | {note} |\n")
print("  table8_jurisdiction.md")

# -- TABLE 9: Complexity vs Performance --
with open("tables/table9_complexity.md","w") as f:
    f.write("# Table 9 — Plan Complexity vs Performance (Proposed System)\n\n")
    f.write("| Room Count Group | Mean CSR (%) | Mean GT (s) |\n")
    f.write("|------------------|--------------|-------------|\n")
    cp = sm["complexity_vs_performance"]
    for g, label in [("rooms_2_3","2–3 Rooms"),("rooms_4_5","4–5 Rooms"),
                     ("rooms_6_8","6–8 Rooms"),("rooms_9_plus","9+ Rooms")]:
        f.write(f"| {label} | {fmt(cp.get(g,{}).get('mean_csr'))} | {fmt(cp.get(g,{}).get('mean_gt'))} |\n")
print("  table9_complexity.md")

# -- TABLE 10: Vaastu vs Non-Vaastu --
with open("tables/table10_vaastu_comparison.md","w") as f:
    f.write("# Table 10 — Vaastu-Required vs Non-Vaastu Plans (Proposed System)\n\n")
    f.write("| Condition | Mean CSR (%) | Mean VC | Mean GT (s) |\n")
    f.write("|-----------|--------------|---------|-------------|\n")
    vv = sm["vaastu_vs_non_vaastu"]
    f.write(f"| Vaastu Required     | {fmt(vv['vaastu_required']['mean_csr'])} "
            f"| {fmt(vv['vaastu_required']['mean_vc'])} "
            f"| {fmt(vv['vaastu_required']['mean_gt'])} |\n")
    f.write(f"| Vaastu Not Required | {fmt(vv['vaastu_not_required']['mean_csr'])} "
            f"| {fmt(vv['vaastu_not_required']['mean_vc'])} "
            f"| {fmt(vv['vaastu_not_required']['mean_gt'])} |\n")
print("  table10_vaastu_comparison.md")

# -- TABLE 11: 7-Model Layout Benchmark --
with open("tables/table11_model_benchmark.md","w") as f:
    f.write("# Table 11 — Multi-Model Layout Generation Benchmark\n\n")
    f.write("| Model | Provider | Tier | Parse Success (%) | Mean Latency (s) | Mean Cost (USD) |\n")
    f.write("|-------|----------|------|-------------------|------------------|------------------|\n")
    mb = sm.get("model_benchmark",{})
    providers = {
        "gpt-4o":"OpenAI","gpt-4o-mini":"OpenAI","gpt-4.1":"OpenAI",
        "gemini-2.5-pro":"Google","gemini-2.5-flash":"Google","llama-3.3-70b":"Groq/Meta"
    }
    tiers = {
        "gpt-4o":1,"gpt-4o-mini":2,"gpt-4.1":1,
        "gemini-2.5-pro":1,"gemini-2.5-flash":2,"llama-3.3-70b":2
    }
    for model in ["gpt-4o","gpt-4.1","gemini-2.5-pro",
                  "gpt-4o-mini","gemini-2.5-flash","llama-3.3-70b"]:
        r = mb.get(model,{})
        f.write(f"| {model} | {providers.get(model,'—')} | {tiers.get(model,'—')} "
                f"| {fmt(r.get('parse_success_pct'))} "
                f"| {fmt(r.get('mean_latency_s'))} "
                f"| {fmt(r.get('mean_cost_usd'),5) if r.get('mean_cost_usd') else '—'} |\n")
print("  table11_model_benchmark.md")

# -- TABLE 12: Image Generation Fidelity --
with open("tables/table12_image_fidelity.md","w") as f:
    f.write("# Table 12 — Image Generation Fidelity Scores (GPT-4o Judge, 1–5 scale)\n\n")
    f.write("| Model | Image Backend | Mean Fidelity Score |\n")
    f.write("|-------|---------------|---------------------|\n")
    imf = sm.get("image_fidelity_scores",{})
    backends = {
        "gpt-4o":"DALL-E 3","gpt-4o-mini":"DALL-E 3","gpt-4.1":"DALL-E 3",
        "gemini-2.5-pro":"Imagen 3","gemini-2.5-flash":"Imagen 3",
        "llama-3.3-70b":"Renderer Fallback"
    }
    for model in ["gpt-4.1","gpt-4o","gemini-2.5-pro",
                  "gemini-2.5-flash","gpt-4o-mini","llama-3.3-70b"]:
        score = imf.get(model)
        f.write(f"| {model} | {backends.get(model,'—')} "
                f"| {fmt(score,2) if score else '— (text only)'} |\n")
    f.write("\n_Dimensions scored: Room labeling, Spatial proportionality, "
            "Adjacency correctness, Drawing style, Deployment readiness._\n")
print("  table12_image_fidelity.md")

print("\nAll tables written to tables/")
