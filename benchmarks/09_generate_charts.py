import json, os
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

os.makedirs("charts", exist_ok=True)
plt.rcParams.update({"font.family":"serif","font.size":11,"figure.dpi":150})

with open("all_metrics.json") as f:
    m = json.load(f)
pm = m["primary_metrics"]
sm = m["secondary_metrics"]

COLORS = {"single_shot":"#e74c3c","posthoc":"#f39c12","proposed":"#27ae60"}

# -- CHART 1: CSR Comparison Bar --
fig, ax = plt.subplots(figsize=(8,5))
csr = pm["constraint_satisfaction_rate"]
methods = ["Single-Shot LLM","LLM + Post-Hoc Val.","Proposed System"]
vals    = [csr["baseline_single_shot"]["mean"] or 0,
           csr["baseline_posthoc"]["mean"] or 0,
           csr["proposed"]["mean"] or 0]
errs    = [csr["baseline_single_shot"]["std"] or 0,
           csr["baseline_posthoc"]["std"] or 0,
           csr["proposed"]["std"] or 0]
colors  = [COLORS["single_shot"],COLORS["posthoc"],COLORS["proposed"]]
bars = ax.bar(methods, vals, yerr=errs, color=colors, capsize=5, width=0.5, alpha=0.88)
for bar, val in zip(bars, vals):
    ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+1.5,
            f"{val:.1f}%", ha="center", fontweight="bold")
ax.set_ylabel("Constraint Satisfaction Rate (%)")
ax.set_title("Fig 1 — CSR: Proposed System vs Baselines")
ax.set_ylim(0, 100)
ax.axhline(70, color="navy", linestyle="--", alpha=0.5, label="Convergence threshold (70%)")
ax.legend()
plt.tight_layout()
plt.savefig("charts/fig1_csr_comparison.png")
plt.close()
print("  fig1_csr_comparison.png")

# -- CHART 2: CSR per Category Grouped Bar --
fig, ax = plt.subplots(figsize=(10,5))
cats = ["residential_single","residential_multi","commercial_office","culturally_constrained"]
cat_labels = ["Res. Single","Res. Multi","Commercial","Cultural"]
pc = csr["per_category"]
x = np.arange(len(cats))
w = 0.25
for i, (method_key, label, color) in enumerate([
    ("baseline_single_shot","Single-Shot",COLORS["single_shot"]),
    ("baseline_posthoc","Post-Hoc Val.",COLORS["posthoc"]),
    ("proposed","Proposed",COLORS["proposed"])
]):
    vals = [pc.get(c,{}).get(method_key) or 0 for c in cats]
    ax.bar(x + i*w, vals, w, label=label, color=color, alpha=0.88)
ax.set_xticks(x+w); ax.set_xticklabels(cat_labels)
ax.set_ylabel("CSR (%)"); ax.set_ylim(0,100)
ax.set_title("Fig 2 — CSR by Category and Method")
ax.legend()
plt.tight_layout()
plt.savefig("charts/fig2_csr_by_category.png")
plt.close()
print("  fig2_csr_by_category.png")

# -- CHART 3: Convergence Score Progression --
fig, ax = plt.subplots(figsize=(7,5))
sp = pm["iteration_improvement"]["mean_score_per_iteration"]
iters_labels = ["Iter 0\n(Initial)","Iter 1","Iter 2","Iter 3"]
scores = [sp.get(f"iter_{i}") or 0 for i in range(4)]
ax.plot(iters_labels, scores, "o-", color=COLORS["proposed"], linewidth=2.5, markersize=8)
for x_pos, y_pos in enumerate(scores):
    if y_pos > 0:
        ax.annotate(f"{y_pos:.3f}", (x_pos,y_pos), textcoords="offset points",
                    xytext=(0,10), ha="center")
ax.axhline(0.70, color="navy", linestyle="--", alpha=0.6, label="Threshold = 0.70")
ax.set_ylabel("Mean Composite Score")
ax.set_title("Fig 3 — Compliance Score Progression Across Iterations")
ax.set_ylim(0,1); ax.legend()
plt.tight_layout()
plt.savefig("charts/fig3_convergence.png")
plt.close()
print("  fig3_convergence.png")

# -- CHART 4: Convergence Distribution Pie --
fig, ax = plt.subplots(figsize=(6,6))
cd = pm["iteration_improvement"]["convergence_distribution"]
sizes  = [cd.get("iteration_1_pct") or 0, cd.get("iteration_2_pct") or 0,
          cd.get("iteration_3_pct") or 0, cd.get("non_converged_pct") or 0]
labels = ["Converged\nIter 1","Converged\nIter 2","Converged\nIter 3","Non-Converged"]
pie_colors = ["#27ae60","#2ecc71","#f39c12","#e74c3c"]
# Filter out zero-size slices to avoid matplotlib warnings
non_zero = [(s,l,c) for s,l,c in zip(sizes,labels,pie_colors) if s > 0]
if non_zero:
    sizes_nz, labels_nz, colors_nz = zip(*non_zero)
    wedges, texts, autotexts = ax.pie(sizes_nz, labels=labels_nz, colors=colors_nz,
        autopct="%1.1f%%", startangle=90, pctdistance=0.78)
ax.set_title("Fig 4 — Convergence Distribution (120 Plans)")
plt.tight_layout()
plt.savefig("charts/fig4_convergence_pie.png")
plt.close()
print("  fig4_convergence_pie.png")

# -- CHART 5: Violation Type Distribution --
fig, ax = plt.subplots(figsize=(9,5))
vtd = sm["violation_type_distribution"]
vt_labels = {
    "vaastu_directional":"Vaastu\nDirectional","vaastu_proportional":"Vaastu\nProportion",
    "regulatory_egress":"Reg.\nEgress","regulatory_area":"Reg.\nArea",
    "regulatory_setback":"Reg.\nSetback","spatial_adjacency":"Spatial\nAdjacency",
    "spatial_efficiency":"Spatial\nEfficiency"
}
keys = list(vt_labels.keys())
counts = [vtd.get(k,{}).get("count") or 0 for k in keys]
bar_colors = ["#8e44ad","#9b59b6","#e74c3c","#c0392b","#e67e22","#2980b9","#3498db"]
ax.bar([vt_labels[k] for k in keys], counts, color=bar_colors, alpha=0.88)
ax.set_ylabel("Total Violation Count")
ax.set_title("Fig 5 — Violation Type Distribution Across All Plans")
plt.tight_layout()
plt.savefig("charts/fig5_violation_types.png")
plt.close()
print("  fig5_violation_types.png")

# -- CHART 6: Critic Dimension Radar --
dims = ["Functionality","Circulation","Natural Light","Privacy","Proportion","Cultural Sens."]
cds = sm["critic_dimension_scores"]
dim_keys = ["functionality","circulation","natural_light","privacy","proportion","cultural_sensitivity"]
values = [cds.get(k) or 0 for k in dim_keys]
values += values[:1]  # close polygon
angles = np.linspace(0, 2*np.pi, len(dims), endpoint=False).tolist()
angles += angles[:1]
fig, ax = plt.subplots(figsize=(6,6), subplot_kw=dict(polar=True))
ax.plot(angles, values, "o-", color=COLORS["proposed"], linewidth=2)
ax.fill(angles, values, color=COLORS["proposed"], alpha=0.25)
ax.set_thetagrids(np.degrees(angles[:-1]), dims, fontsize=9)
ax.set_ylim(0,1)
ax.set_title("Fig 6 — Critic Agent Dimension Scores (Proposed System)", pad=20)
plt.tight_layout()
plt.savefig("charts/fig6_critic_radar.png")
plt.close()
print("  fig6_critic_radar.png")

# -- CHART 7: Model Benchmark — Latency --
fig, ax = plt.subplots(figsize=(9,5))
mb = sm.get("model_benchmark",{})
models_plot = [m for m in ["gpt-4.1","gpt-4o","gemini-2.5-pro",
               "gemini-2.5-flash","gpt-4o-mini","llama-3.3-70b"] if m in mb]
latencies = [mb.get(m,{}).get("mean_latency_s") or 0 for m in models_plot]
m_colors = ["#16213e","#0f3460","#533483","#6a0572","#b5179e","#e07a5f"][:len(models_plot)]
bars = ax.barh(models_plot, latencies, color=m_colors, alpha=0.88)
for bar, val in zip(bars, latencies):
    ax.text(bar.get_width()+0.1, bar.get_y()+bar.get_height()/2,
            f"{val:.1f}s", va="center")
ax.set_xlabel("Mean Latency (seconds)")
ax.set_title("Fig 7 — Per-Model Latency Comparison (Layout Generation)")
plt.tight_layout()
plt.savefig("charts/fig7_model_latency.png")
plt.close()
print("  fig7_model_latency.png")

# -- CHART 8: Image Fidelity Scores --
fig, ax = plt.subplots(figsize=(9,5))
imf = sm.get("image_fidelity_scores",{})
img_models = [m for m in models_plot if m in imf]
if img_models:
    img_scores = [imf.get(m) or 0 for m in img_models]
    bars = ax.bar(img_models, img_scores,
                  color=["#16213e","#0f3460","#533483","#6a0572","#b5179e"][:len(img_models)],
                  alpha=0.88)
    for bar, val in zip(bars, img_scores):
        ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.05,
                f"{val:.2f}", ha="center")
ax.set_ylabel("Mean Fidelity Score (1–5)")
ax.set_ylim(0,5)
ax.set_title("Fig 8 — Image Generation Fidelity by Model (GPT-4o Judge)")
ax.tick_params(axis="x", rotation=20)
plt.tight_layout()
plt.savefig("charts/fig8_image_fidelity.png")
plt.close()
print("  fig8_image_fidelity.png")

# -- CHART 9: Complexity vs CSR + GT --
fig, ax1 = plt.subplots(figsize=(8,5))
cp = sm["complexity_vs_performance"]
groups = ["rooms_2_3","rooms_4_5","rooms_6_8","rooms_9_plus"]
labels = ["2-3 Rooms","4-5 Rooms","6-8 Rooms","9+ Rooms"]
csrs_ = [cp.get(g,{}).get("mean_csr") or 0 for g in groups]
gts_  = [cp.get(g,{}).get("mean_gt") or 0  for g in groups]
x = np.arange(len(groups))
ax1.bar(x, csrs_, 0.4, label="Mean CSR (%)", color=COLORS["proposed"], alpha=0.8)
ax2 = ax1.twinx()
ax2.plot(x, gts_, "s--", color="#e74c3c", linewidth=2, markersize=7, label="Mean GT (s)")
ax1.set_xticks(x); ax1.set_xticklabels(labels)
ax1.set_ylabel("Mean CSR (%)"); ax2.set_ylabel("Mean Generation Time (s)")
ax1.set_title("Fig 9 — Plan Complexity vs CSR and Generation Time")
lines1, labels1 = ax1.get_legend_handles_labels()
lines2, labels2 = ax2.get_legend_handles_labels()
ax1.legend(lines1+lines2, labels1+labels2, loc="lower left")
plt.tight_layout()
plt.savefig("charts/fig9_complexity.png")
plt.close()
print("  fig9_complexity.png")

# -- CHART 10: Jurisdiction CSR --
fig, ax = plt.subplots(figsize=(7,4))
pj = sm["per_jurisdiction_csr"]
juris = ["NBC","BBMP","BMC","MCD"]
j_csrs = [pj.get(j,{}).get("mean_csr") or 0 for j in juris]
j_vcs  = [pj.get(j,{}).get("mean_vc")  or 0 for j in juris]
x = np.arange(len(juris))
ax.bar(x-0.2, j_csrs, 0.35, label="Mean CSR (%)", color=COLORS["proposed"], alpha=0.88)
ax2 = ax.twinx()
ax2.bar(x+0.2, j_vcs, 0.35, label="Mean VC", color="#e74c3c", alpha=0.88)
ax.set_xticks(x); ax.set_xticklabels(juris)
ax.set_ylabel("Mean CSR (%)"); ax2.set_ylabel("Mean Violation Count")
ax.set_title("Fig 10 — CSR and Violation Count by Jurisdiction")
lines1,lbls1 = ax.get_legend_handles_labels()
lines2,lbls2 = ax2.get_legend_handles_labels()
ax.legend(lines1+lines2, lbls1+lbls2)
plt.tight_layout()
plt.savefig("charts/fig10_jurisdiction.png")
plt.close()
print("  fig10_jurisdiction.png")

print("\nAll charts saved to charts/")
