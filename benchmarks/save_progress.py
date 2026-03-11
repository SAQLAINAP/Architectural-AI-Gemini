"""Save current benchmark progress to results.md - run periodically."""
import json, os
from datetime import datetime

BENCH_DIR = "/Users/saqlain.p/Misc/Architectural-AI-Gemini/benchmarks"
RESULTS_FILE = "/Users/saqlain.p/Misc/Architectural-AI-Gemini/results.md"

def safe_load(path):
    full = os.path.join(BENCH_DIR, path)
    if os.path.exists(full):
        with open(full) as f:
            return json.load(f)
    return None

def safe_mean(lst):
    lst = [x for x in lst if x is not None]
    return round(sum(lst)/len(lst), 2) if lst else None

def fmt(v, d=1):
    if v is None: return "—"
    return f"{v:.{d}f}"

now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
lines = [f"# Benchmark Results (auto-saved {now})\n"]

# --- Baselines ---
bl = safe_load("baseline_results.json")
if bl:
    b1 = [r for r in bl.get("baseline_1", []) if "error" not in r]
    b2 = [r for r in bl.get("baseline_2", []) if "error" not in r]
    lines.append(f"## Script 02 — Baselines: COMPLETE ({len(b1)} B1, {len(b2)} B2)\n")

    b1_csr = safe_mean([r["csr"] for r in b1])
    b1_se  = safe_mean([r["se"] for r in b1])
    b1_vc  = safe_mean([r["vc"] for r in b1])
    b1_gt  = safe_mean([r["gt_seconds"] for r in b1])
    b2_csr = safe_mean([r["csr"] for r in b2])
    b2_se  = safe_mean([r["se"] for r in b2])
    b2_vc  = safe_mean([r["vc"] for r in b2])
    b2_gt  = safe_mean([r["gt_seconds"] for r in b2])

    lines.append("| Metric | Baseline 1 (Single-Shot) | Baseline 2 (Post-Hoc) |")
    lines.append("|--------|--------------------------|----------------------|")
    lines.append(f"| CSR (%) | {fmt(b1_csr)} | {fmt(b2_csr)} |")
    lines.append(f"| SE (%) | {fmt(b1_se)} | {fmt(b2_se)} |")
    lines.append(f"| Violations | {fmt(b1_vc)} | {fmt(b2_vc)} |")
    lines.append(f"| Gen Time (s) | {fmt(b1_gt)} | {fmt(b2_gt)} |")
    lines.append("")

    # Per category
    cats = {"residential_single":"Res. Single","residential_multi":"Res. Multi",
            "commercial_office":"Commercial","culturally_constrained":"Cultural"}
    lines.append("### Per-Category CSR\n")
    lines.append("| Category | B1 CSR | B2 CSR |")
    lines.append("|----------|--------|--------|")
    for ck, cl in cats.items():
        c1 = safe_mean([r["csr"] for r in b1 if r.get("category")==ck])
        c2 = safe_mean([r["csr"] for r in b2 if r.get("category")==ck])
        lines.append(f"| {cl} | {fmt(c1)} | {fmt(c2)} |")
    lines.append("")

# --- Proposed ---
prop = safe_load("proposed_results.json")
if prop:
    done = len(prop)
    converged = sum(1 for r in prop if r.get("converged"))
    lines.append(f"## Script 03 — Proposed Pipeline: {done}/120\n")

    csrs = [r["final_csr"] for r in prop if r.get("final_csr") is not None]
    vcs = [r["final_vc"] for r in prop if r.get("final_vc") is not None]
    gts = [r["total_gt"] for r in prop if r.get("total_gt") is not None]
    ses = [r["final_se"] for r in prop if r.get("final_se") is not None]
    scores = [r["final_score"] for r in prop if r.get("final_score") is not None]

    lines.append(f"- Converged: {converged}/{done} ({converged/max(done,1)*100:.0f}%)")
    lines.append(f"- Mean CSR: {fmt(safe_mean(csrs))}%")
    lines.append(f"- Mean SE: {fmt(safe_mean(ses))}%")
    lines.append(f"- Mean Violations: {fmt(safe_mean(vcs))}")
    lines.append(f"- Mean Score: {fmt(safe_mean(scores), 3)}")
    lines.append(f"- Mean Gen Time: {fmt(safe_mean(gts))}s")
    lines.append("")

    # convergence distribution
    conv_at = [r.get("converged_at") for r in prop if r.get("converged")]
    if conv_at:
        lines.append("### Convergence Distribution\n")
        for i in [1,2,3]:
            pct = sum(1 for x in conv_at if x==i)/max(done,1)*100
            lines.append(f"- Iter {i}: {pct:.1f}%")
        non_conv = sum(1 for r in prop if not r.get("converged"))/max(done,1)*100
        lines.append(f"- Non-converged: {non_conv:.1f}%")
        lines.append("")

# --- Model Bench ---
mb = safe_load("model_bench_results.json")
if mb:
    models = {}
    for r in mb:
        m = r["model"]
        if m not in models: models[m] = []
        models[m].append(r)

    total = len(mb)
    lines.append(f"## Script 04 — Model Benchmark: {total} results\n")
    lines.append("| Model | N | Parse % | Mean Latency | Mean Rooms |")
    lines.append("|-------|---|---------|--------------|------------|")
    for model, rows in models.items():
        n = len(rows)
        parse_pct = sum(1 for r in rows if r.get("parse_success"))/max(n,1)*100
        lat = safe_mean([r["latency_s"] for r in rows])
        rooms = safe_mean([r["room_count"] for r in rows if r.get("parse_success")])
        lines.append(f"| {model} | {n} | {parse_pct:.0f}% | {fmt(lat)}s | {fmt(rooms)} |")
    lines.append("")

# --- Image Gen ---
ig = safe_load("imagegen_results.json")
if ig:
    lines.append(f"## Script 05 — Image Gen: {len(ig)} results\n")
    ok = sum(1 for r in ig if not r.get("error"))
    lines.append(f"- Successful: {ok}/{len(ig)}")
    lines.append("")

# --- Image Scoring ---
isc = safe_load("imagegen_scored.json")
if isc:
    scored = [r for r in isc if r.get("scores")]
    lines.append(f"## Script 06 — Image Scoring: {len(scored)} scored\n")
    lines.append("")

# --- All Metrics ---
am = safe_load("all_metrics.json")
if am:
    lines.append("## Script 07 — Metrics: COMPUTED\n")

# --- Tables ---
if os.path.exists(os.path.join(BENCH_DIR, "tables")):
    table_files = os.listdir(os.path.join(BENCH_DIR, "tables"))
    if table_files:
        lines.append(f"## Script 08 — Tables: {len(table_files)} generated\n")

# --- Charts ---
if os.path.exists(os.path.join(BENCH_DIR, "charts")):
    chart_files = os.listdir(os.path.join(BENCH_DIR, "charts"))
    if chart_files:
        lines.append(f"## Script 09 — Charts: {len(chart_files)} generated\n")

with open(RESULTS_FILE, "w") as f:
    f.write("\n".join(lines))

print(f"Progress saved to {RESULTS_FILE}")
