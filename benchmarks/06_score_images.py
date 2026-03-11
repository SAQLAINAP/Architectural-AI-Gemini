import os, base64, json
from openai import OpenAI

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

JUDGE_PROMPT = """You are an architectural drawing quality evaluator.
Score this floor plan image on 5 dimensions (integer 1-5 each).

Expected layout: {layout_desc}

Return ONLY JSON:
{{
  "room_labeling": int,
  "spatial_proportionality": int,
  "adjacency_correctness": int,
  "drawing_style": int,
  "deployment_readiness": int,
  "notes": str
}}"""

LAYOUT_DESCS = {
    "L1": "2BHK residential: living north, kitchen south-east, 2 bedrooms east, parking south",
    "L2": "Commercial office: reception north, open workspace center, meeting rooms east, server room south-west",
    "L3": "Vaastu 3BHK: entrance east, kitchen south-east, master bedroom south-west, pooja north-east",
}

with open("imagegen_results.json") as f:
    results = json.load(f)

scored = []
for r in results:
    if r.get("error") or not r.get("file"):
        scored.append({**r, "scores": None})
        print(f"  {r.get('model','?')} {r.get('layout_id','?')} -> skipped (no image)")
        continue
    try:
        with open(r["file"],"rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        layout_desc = LAYOUT_DESCS.get(r["layout_id"], r["layout_id"])
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role":"user","content":[
                {"type":"image_url","image_url":{"url":f"data:image/png;base64,{b64}"}},
                {"type":"text","text":JUDGE_PROMPT.format(layout_desc=layout_desc)}
            ]}],
            response_format={"type":"json_object"}
        )
        scores = json.loads(resp.choices[0].message.content)
        scored.append({**r,"scores":scores})
        print(f"  {r['model']} {r['layout_id']} -> {scores}")
    except Exception as e:
        scored.append({**r,"scores":None,"score_error":str(e)})
        print(f"  {r['model']} {r['layout_id']} ERROR: {e}")

with open("imagegen_scored.json","w") as f:
    json.dump(scored, f, indent=2)
print(f"Scoring done -> imagegen_scored.json ({len(scored)} entries)")
