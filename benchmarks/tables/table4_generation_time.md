# Table 4 — Generation Time Breakdown

| Phase | Mean Time (s) | Description |
|-------|---------------|-------------|
| Phase 1 | 13.1 | Input normalization + spatial generation |
| Phase 2 | 5.1 | Iterative validation + refinement loop |
| Phase 3 | 13.4 | Cost estimation + furniture placement |
| **Total (Proposed)** | **31.6 ± 15.6** | Full pipeline |
| Baseline 1 (Single-Shot) | 7.5 ± 2.8 | Single call |
| Baseline 2 (Post-Hoc)    | 7.2 ± 2.0 | Single call + validation |
