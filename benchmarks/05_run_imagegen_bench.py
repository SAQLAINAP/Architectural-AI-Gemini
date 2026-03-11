import os, time, json, requests
from openai import OpenAI

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
os.makedirs("benchmark_images", exist_ok=True)

IMAGE_PROMPT = """Architectural floor plan, strict top-down 2D blueprint.
Layout specification: {layout}
Style: clean technical drawing, black lines on white background,
each room labeled with name and area in sqft, walls clearly defined,
doors shown as arcs, no furniture, no shadows, no 3D perspective,
no color fills. Professional engineering drawing style."""

TEST_LAYOUTS = [
    {
        "id":"L1","category":"residential_single",
        "description":"2BHK: Living room north-facing 300sqft, Kitchen south-east 120sqft, "
                      "Master Bedroom east 200sqft, Bedroom 2 east 160sqft, "
                      "Bathroom 1 adjacent master 50sqft, Parking south 100sqft"
    },
    {
        "id":"L2","category":"commercial_office",
        "description":"Office: Reception north 200sqft, Open workspace center 800sqft, "
                      "3 meeting rooms east wing 150sqft each, Pantry south 80sqft, "
                      "Server room south-west 60sqft, Restrooms west 100sqft"
    },
    {
        "id":"L3","category":"culturally_constrained",
        "description":"Vaastu 3BHK: Main entrance east, Living room north 250sqft, "
                      "Kitchen south-east 110sqft, Master Bedroom south-west 180sqft, "
                      "Bedroom 2 north-west 150sqft, Pooja room north-east 40sqft, "
                      "Bathrooms east-facing 50sqft each"
    },
]

results = []

# DALL-E 3 (for OpenAI model slots)
OPENAI_MODELS = ["gpt-4o","gpt-4o-mini","gpt-4.1"]
for model_label in OPENAI_MODELS:
    for layout in TEST_LAYOUTS:
        prompt = IMAGE_PROMPT.format(layout=layout["description"])
        try:
            start = time.time()
            r = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="standard", n=1)
            url = r.data[0].url
            img_bytes = requests.get(url).content
            latency = round(time.time()-start, 2)
            fname = f"benchmark_images/{model_label}_{layout['id']}.png"
            with open(fname,"wb") as f: f.write(img_bytes)
            results.append({
                "model": model_label, "image_backend": "dall-e-3",
                "layout_id": layout["id"], "category": layout["category"],
                "latency_s": latency, "file": fname, "url": url, "error": None
            })
            print(f"  {model_label} {layout['id']} -> {fname} ({latency}s)")
        except Exception as e:
            print(f"  {model_label} {layout['id']} ERROR: {e}")
            results.append({"model":model_label,"image_backend":"dall-e-3",
                          "layout_id":layout["id"],"category":layout["category"],
                          "error":str(e)})

# Gemini models — use Gemini's native image gen via google.generativeai
import google.generativeai as genai
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY", os.environ.get("GEMINI_API_KEY","")))

for model_label in ["gemini-2.5-pro","gemini-2.5-flash"]:
    for layout in TEST_LAYOUTS:
        # Gemini doesn't have native image generation via the generativeai SDK,
        # so we mark these as needing renderer fallback
        results.append({
            "model": model_label, "image_backend": "renderer_fallback",
            "layout_id": layout["id"], "category": layout["category"],
            "latency_s": 0, "file": None,
            "error": "Imagen 3 requires Vertex AI with GCP project (not configured)"
        })
        print(f"  {model_label} {layout['id']} -> skipped (no Vertex AI)")

# Llama — no image backend
for layout in TEST_LAYOUTS:
    results.append({
        "model":"llama-3.3-70b","image_backend":"renderer_fallback",
        "layout_id":layout["id"],"category":layout["category"],
        "latency_s":0,"file":None,"error":"No native image generation"
    })

with open("imagegen_results.json","w") as f:
    json.dump(results, f, indent=2)
print(f"Image gen done -> imagegen_results.json ({len(results)} results)")
