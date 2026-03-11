"""Gemini Nano Banana image generation benchmark.
Uses gemini-2.5-flash-image (Nano Banana) and gemini-3.1-flash-image-preview
for native image generation with retry logic for rate limits.
"""
import os, time, json, base64, re

from google import genai
from google.genai import types

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
client = genai.Client(api_key=GEMINI_API_KEY)

os.makedirs("benchmark_images", exist_ok=True)

IMAGE_PROMPT = """Generate an architectural floor plan as a top-down 2D blueprint drawing.
Layout specification: {layout}
Requirements: clean technical drawing, black lines on white background,
each room labeled with name and area in sqft, walls clearly defined,
doors shown as arcs, no furniture, no shadows, no 3D perspective,
no color fills. Professional engineering drawing style."""

TEST_LAYOUTS = [
    {
        "id": "L1", "category": "residential_single",
        "description": "2BHK: Living room north-facing 300sqft, Kitchen south-east 120sqft, "
                       "Master Bedroom east 200sqft, Bedroom 2 east 160sqft, "
                       "Bathroom 1 adjacent master 50sqft, Parking south 100sqft"
    },
    {
        "id": "L2", "category": "commercial_office",
        "description": "Office: Reception north 200sqft, Open workspace center 800sqft, "
                       "3 meeting rooms east wing 150sqft each, Pantry south 80sqft, "
                       "Server room south-west 60sqft, Restrooms west 100sqft"
    },
    {
        "id": "L3", "category": "culturally_constrained",
        "description": "Vaastu 3BHK: Main entrance east, Living room north 250sqft, "
                       "Kitchen south-east 110sqft, Master Bedroom south-west 180sqft, "
                       "Bedroom 2 north-west 150sqft, Pooja room north-east 40sqft, "
                       "Bathrooms east-facing 50sqft each"
    },
]

GEMINI_IMAGE_MODELS = [
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image-preview",
]

MAX_RETRIES = 5


def generate_with_retry(model_name, prompt, max_retries=MAX_RETRIES):
    """Call Gemini image gen with exponential backoff on rate limit errors."""
    for attempt in range(max_retries):
        try:
            start = time.time()
            resp = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["TEXT", "IMAGE"],
                ),
            )
            latency = round(time.time() - start, 2)
            return resp, latency, None
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                # Extract retry delay from error message
                match = re.search(r'retry in ([\d.]+)s', err_str)
                wait_time = float(match.group(1)) + 5 if match else 60
                wait_time = min(wait_time, 120)
                print(f"\n    Rate limited (attempt {attempt+1}/{max_retries}), waiting {wait_time:.0f}s...",
                      end=" ", flush=True)
                time.sleep(wait_time)
            else:
                return None, 0, err_str[:500]
    return None, 0, f"Rate limit exceeded after {max_retries} retries"


# Load existing results — but remove failed Gemini entries so we can retry
if os.path.exists("imagegen_results.json"):
    with open("imagegen_results.json") as f:
        all_results = json.load(f)
    # Remove previous failed Gemini native entries
    all_results = [r for r in all_results
                   if not (r.get("image_backend") == "gemini_native" and r.get("error"))
                   and not (r.get("image_backend") == "renderer_fallback"
                            and r.get("model", "").startswith("gemini"))]
else:
    all_results = []

# Track which combos already done successfully
done_keys = {(r["model"], r["layout_id"]) for r in all_results
             if r.get("file") and not r.get("error")}

new_results = []

for model_name in GEMINI_IMAGE_MODELS:
    for layout in TEST_LAYOUTS:
        key = (model_name, layout["id"])
        if key in done_keys:
            print(f"  {model_name} {layout['id']} -> already done, skipping")
            continue

        prompt = IMAGE_PROMPT.format(layout=layout["description"])
        print(f"  {model_name} {layout['id']} -> generating...", end=" ", flush=True)

        resp, latency, error = generate_with_retry(model_name, prompt)

        if error:
            rec = {
                "model": model_name,
                "image_backend": "gemini_native",
                "layout_id": layout["id"],
                "category": layout["category"],
                "latency_s": 0,
                "file": None,
                "error": error
            }
            new_results.append(rec)
            all_results.append(rec)
            print(f"ERROR: {error[:200]}")
            continue

        # Extract image from response
        image_saved = False
        text_resp = ""
        for part in resp.candidates[0].content.parts:
            if hasattr(part, "text") and part.text:
                text_resp = part.text[:200]
            if hasattr(part, "inline_data") and part.inline_data:
                img_data = part.inline_data.data
                if isinstance(img_data, str):
                    img_data = base64.b64decode(img_data)
                fname = f"benchmark_images/{model_name}_{layout['id']}.png"
                with open(fname, "wb") as f:
                    f.write(img_data)
                image_saved = True

                rec = {
                    "model": model_name,
                    "image_backend": "gemini_native",
                    "layout_id": layout["id"],
                    "category": layout["category"],
                    "latency_s": latency,
                    "file": fname,
                    "url": None,
                    "error": None
                }
                new_results.append(rec)
                all_results.append(rec)
                print(f"OK ({latency}s) -> {fname}")

        if not image_saved:
            rec = {
                "model": model_name,
                "image_backend": "gemini_native",
                "layout_id": layout["id"],
                "category": layout["category"],
                "latency_s": latency,
                "file": None,
                "error": f"No image in response. Text: {text_resp}"
            }
            new_results.append(rec)
            all_results.append(rec)
            print(f"NO IMAGE ({latency}s) - text: {text_resp[:100]}")

        # Rate limit pause between requests (free tier: ~10 RPM for image models)
        time.sleep(15)

# Save combined results
with open("imagegen_results.json", "w") as f:
    json.dump(all_results, f, indent=2)

successful = sum(1 for r in new_results if r.get("file") and not r.get("error"))
print(f"\nGemini image gen done. {successful}/{len(new_results)} successful, "
      f"{len(all_results)} total -> imagegen_results.json")
