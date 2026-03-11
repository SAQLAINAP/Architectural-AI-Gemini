import json, time, os, re
from openai import OpenAI
import google.generativeai as genai
from groq import Groq

openai_cl = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
groq_cl   = Groq(api_key=os.environ.get("GROQ_API_KEY"))
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY", os.environ.get("GEMINI_API_KEY","")))

MODELS = {
    "gpt-4o":           ("openai",  "gpt-4o"),
    "gpt-4o-mini":      ("openai",  "gpt-4o-mini"),
    "gpt-4.1":          ("openai",  "gpt-4.1"),
    "gemini-2.5-pro":   ("google",  "gemini-2.5-pro-preview-05-06"),
    "gemini-2.5-flash": ("google",  "gemini-2.5-flash-preview-04-17"),
    "llama-3.3-70b":    ("groq",    "llama-3.3-70b-versatile"),
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

# Use first 10 prompts per category = 40 prompts
cats = ["residential_single","residential_multi","commercial_office","culturally_constrained"]
sample = []
for cat in cats:
    cat_items = [p for p in corpus if p["category"]==cat]
    sample.extend(cat_items[:10])

print(f"Sample size: {len(sample)} prompts")

def extract_json(raw):
    """Try to extract JSON from a response that may have markdown fences."""
    cleaned = re.sub(r'```json\s*', '', raw)
    cleaned = re.sub(r'```\s*', '', cleaned)
    cleaned = cleaned.strip()
    return json.loads(cleaned)

results = []
for model_name, (provider, model_id) in MODELS.items():
    print(f"\n== {model_name} ({provider}) ==")
    for item in sample:
        prompt = LAYOUT_PROMPT.format(spec=item["prompt"])
        start = time.time()
        try:
            if provider == "openai":
                r = openai_cl.chat.completions.create(
                    model=model_id,
                    messages=[{"role":"user","content":prompt}],
                    response_format={"type":"json_object"},
                    max_tokens=1500)
                raw = r.choices[0].message.content
                tokens = r.usage.total_tokens
                cost_usd = r.usage.prompt_tokens*0.000003 + r.usage.completion_tokens*0.000015

            elif provider == "google":
                m = genai.GenerativeModel(model_id)
                r = m.generate_content(prompt)
                raw = r.text
                tokens = 0
                cost_usd = 0

            elif provider == "groq":
                r = groq_cl.chat.completions.create(
                    model=model_id,
                    messages=[{"role":"user","content":prompt}],
                    max_tokens=1500)
                raw = r.choices[0].message.content
                tokens = r.usage.total_tokens
                cost_usd = tokens * 0.0000006

            latency = time.time() - start
            plan = extract_json(raw)
            parse_ok = True
            room_count = len(plan.get("rooms",[]))

        except Exception as e:
            latency = time.time() - start
            parse_ok = False
            room_count = 0
            cost_usd = 0
            tokens = 0
            plan = {}
            print(f"  ERROR {item['id']}: {str(e)[:80]}")

        results.append({
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

    # Save after each model
    with open("model_bench_results.json","w") as f:
        json.dump(results, f, indent=2)
    print(f"  [checkpoint: {model_name} done]")

with open("model_bench_results.json","w") as f:
    json.dump(results, f, indent=2)
print(f"\nModel benchmark done -> model_bench_results.json ({len(results)} results)")
