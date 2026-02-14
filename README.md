# Architectural AI Agent

AI-powered architectural design platform that generates floor plans, validates compliance, estimates costs, and provides interactive plan modification — all orchestrated by a multi-agent Gemini backend.

## Key Features

- **Multi-Agent Floor Plan Generation** — 6 specialized AI agents (Input, Spatial, Critic, Refinement, Cost, Furniture) with iterative scoring and convergence
- **Regulatory & Cultural Compliance** — Deterministic validators for municipal building codes (NBC, BBMP, BMC, MCD) and Vastu Shastra (14 rules)
- **PNG/PDF Export** — Download floor plans as high-resolution PNG or multi-page PDF reports (room schedule, compliance summary, BOM, design log)
- **Natural Language Chat Modification** — Conversational UI to analyze and apply changes with feasibility assessment, Vastu/regulatory impact analysis
- **Version Diff View** — Side-by-side comparison of plan versions with color-coded added/removed/modified rooms
- **Furniture Placement** — AI auto-places furniture with clearance rules, door avoidance, and standard sizing per room type
- **Multi-Floor Generation** — Per-floor layouts with staircase alignment validation and floor-tab navigation
- **Alternative Designs** — Generate 3 distinct layouts in parallel with different strategies (natural light, privacy, open-plan)
- **Material & Cost Estimation** — Detailed BOM with multi-tier quotations and cost distribution charts
- **Cloud Storage** — Save/load projects via Supabase authentication

## Architecture

```
archi-agent_-ai-architect/          # React frontend (Vite + Tailwind)
├── components/
│   ├── FloorPlanSvg.tsx            # Reusable SVG floor plan renderer
│   ├── ChatPanel.tsx               # Chat modification UI
│   ├── VersionDiffView.tsx         # Side-by-side plan diff modal
│   ├── AlternativesGallery.tsx     # 3-design comparison gallery
│   ├── GenerationProgressOverlay   # Real-time agent progress
│   └── NeoComponents.tsx           # Shared UI primitives
├── utils/
│   ├── exportUtils.ts              # PNG/PDF export
│   └── planDiff.ts                 # Room-level diff algorithm
├── services/
│   └── apiService.ts               # Backend API client + SSE streaming
├── views/
│   ├── Dashboard.tsx               # Main plan viewer + controls
│   ├── Configuration.tsx           # Project config stepper
│   └── ...
├── types.ts                        # Shared TypeScript types
└── App.tsx                         # Routing + state management

backend/                            # Express server (TypeScript, NodeNext)
├── src/
│   ├── agents/
│   │   ├── input.agent.ts          # Normalizes user config (Flash)
│   │   ├── spatial.agent.ts        # Generates floor plan layout (Pro)
│   │   ├── critic.agent.ts         # Evaluates plan quality (Pro)
│   │   ├── refinement.agent.ts     # Fixes violations iteratively (Pro)
│   │   ├── cost.agent.ts           # BOM & cost estimation (Flash)
│   │   └── furniture.agent.ts      # Auto-places furniture (Flash)
│   ├── orchestrator/
│   │   └── design.orchestrator.ts  # Multi-agent loop (max 3 iterations, 0.70 threshold)
│   ├── validators/
│   │   ├── vastu.validator.ts      # 14-rule Vastu checker
│   │   └── regulatory.validator.ts # Municipal code validator
│   ├── scoring/
│   │   └── plan.scorer.ts          # Weighted scoring (0.4 reg + 0.3 vastu + 0.2 spatial + 0.1 critic)
│   ├── routes/
│   │   └── api.routes.ts           # REST + SSE endpoints
│   └── models/
│       ├── gemini.client.ts        # Gemini SDK wrapper
│       └── model.router.ts         # Per-agent model config
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Recharts, jsPDF
- **Backend**: Express 5, TypeScript (NodeNext), multi-agent orchestration
- **AI**: Google Gemini (Pro for spatial/critic/refinement, Flash for input/cost/furniture)
- **Auth & Storage**: Supabase
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js v18+
- Google Gemini API key
- Supabase project (URL + Anon Key)

### Installation

```bash
git clone https://github.com/SAQLAINAP/Architectural-AI-Gemini.git
cd Architectural-AI-Gemini
```

**Frontend:**
```bash
cd archi-agent_-ai-architect
npm install
```

**Backend:**
```bash
cd backend
npm install
```

### Environment Variables

**Frontend** (`archi-agent_-ai-architect/.env.local`):
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3001/api
```

**Backend** (`backend/.env`):
```env
GEMINI_API_KEY=your_gemini_api_key
PORT=3001
```

### Run

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd archi-agent_-ai-architect && npm run dev
```

Open `http://localhost:5173` in your browser.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/generate` | Start async floor plan generation |
| GET | `/api/generate/:jobId/stream` | SSE stream for generation progress |
| POST | `/api/modify/analyze` | Analyze modification feasibility |
| POST | `/api/modify/apply` | Apply modification to plan |
| POST | `/api/furniture` | Generate furniture for existing plan |
| POST | `/api/generate-alternatives` | Generate 3 alternative designs (SSE) |
| POST | `/api/analyze-image` | Analyze uploaded floor plan image |
| POST | `/api/estimate` | Material cost estimation |

## License

MIT
