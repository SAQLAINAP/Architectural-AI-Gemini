# Benchmark Results (auto-saved 2026-03-11 23:51:46)

## Script 02 — Baselines: COMPLETE (120 B1, 120 B2)

| Metric | Baseline 1 (Single-Shot) | Baseline 2 (Post-Hoc) |
|--------|--------------------------|----------------------|
| CSR (%) | 74.4 | 74.1 |
| SE (%) | 65.1 | 65.2 |
| Violations | 2.2 | 2.3 |
| Gen Time (s) | 7.5 | 7.2 |

### Per-Category CSR

| Category | B1 CSR | B2 CSR |
|----------|--------|--------|
| Res. Single | 80.1 | 80.0 |
| Res. Multi | 70.4 | 69.6 |
| Commercial | 76.7 | 75.5 |
| Cultural | 70.3 | 71.2 |

## Script 03 — Proposed Pipeline: 120/120

- Converged: 111/120 (92%)
- Mean CSR: 72.9%
- Mean SE: 61.9%
- Mean Violations: 2.5
- Mean Score: 0.810
- Mean Gen Time: 31.6s

### Convergence Distribution

- Iter 1: 92.5%
- Iter 2: 0.0%
- Iter 3: 0.0%
- Non-converged: 7.5%

## Script 04 — Model Benchmark: 240 results

| Model | N | Parse % | Mean Latency | Mean Rooms |
|-------|---|---------|--------------|------------|
| gpt-4o | 40 | 100% | 6.8s | 9.7 |
| gpt-4o-mini | 40 | 100% | 9.7s | 9.6 |
| gpt-4.1 | 40 | 100% | 10.2s | 12.1 |
| llama-3.3-70b | 40 | 98% | 1.6s | 9.4 |
| gemini-2.5-pro | 40 | 0% | 0.1s | — |
| gemini-2.5-flash | 40 | 0% | 0.1s | — |

## Script 05 — Image Gen: 24 results

- Successful: 9/24

## Script 06 — Image Scoring: 9 scored


## Script 07 — Metrics: COMPUTED

## Script 08 — Tables: 12 generated

## Script 09 — Charts: 10 generated
