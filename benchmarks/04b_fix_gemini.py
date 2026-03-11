"""Rerun Gemini models using the new google.genai SDK and patch model_bench_results.json."""
import json, time, os, re
from google import genai

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", os.environ.get("GOOGLE_API_KEY","")))

MODELS = {
    "gemini-2.5-pro":   "gemini-2.5-pro",
    "gemini-2.5-flash": "gemini-2.5-flash",
}

LAYOUT_PROMPT = """Generate a floor plan JSON for: {spec}
Return ONLY valid JSON (no markdown fences):
{{
  "rooms": [{{"name":str,"area_sqft":int,"orientation":str,"adjacent_to":[str]}}],
  "total_area_sqft": int,
  "vaastu_compliant": bool,
  "egress_paths": [str],
  "regulatory_notes": str
}}"""

with open("corpus.json") as f:
    corpus = json.load(f)

cats = ["residential_single","residential_multi","commercial_office","culturally_constrained"]
sample = []
for cat in cats:
    cat_items = [p for p in corpus if p["category"]==cat]
    sample.extend(cat_items[:10])

def extract_json(raw):
    cleaned = re.sub(r'```json\s*', '', raw)
    cleaned = re.sub(r'```\s*', '', cleaned)
    cleaned = cleaned.strip()
    return json.loads(cleaned)

# Load existing results
with open("model_bench_results.json") as f:
    existing = json.load(f)

# Remove old Gemini results
existing = [r for r in existing if r["model"] not in MODELS]

for model_name, model_id in MODELS.items():
    print(f"\n== {model_name} ==")
    for item in sample:
        prompt = LAYOUT_PROMPT.format(spec=item["prompt"])
        start = time.time()
        try:
            response = client.models.generate_content(
                model=model_id,
                contents=prompt,
            )
            raw = response.text
            latency = time.time() - start
            plan = extract_json(raw)
            parse_ok = True
            room_count = len(plan.get("rooms",[]))
            tokens = 0
            cost_usd = 0
        except Exception as e:
            latency = time.time() - start
            parse_ok = False
            room_count = 0
            cost_usd = 0
            tokens = 0
            plan = {}
            print(f"  ERROR {item['id']}: {str(e)[:80]}")

        existing.append({
            "model": model_name,
            "prompt_id": item["id"],
            "category": item["category"],
            "vaastu_required": item.get("vaastu_required",False),
            "parse_success": parse_ok,
            "room_count": room_count,
            "latency_s": round(latency,2),
            "tokens_total": tokens,
            "cost_usd": round(cost_usd,6),
            "plan": plan
        })
        print(f"  {item['id']} parse={parse_ok} rooms={room_count} t={latency:.1f}s")

with open("model_bench_results.json","w") as f:
    json.dump(existing, f, indent=2)
print(f"\nGemini fix done -> model_bench_results.json ({len(existing)} total results)")
