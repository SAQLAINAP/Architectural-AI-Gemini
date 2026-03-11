import json, random

JURISDICTIONS = ["NBC", "BBMP", "BMC", "MCD"]

def make_residential_single():
    plots = [(20,30),(25,35),(30,40),(35,50),(40,60)]
    bhk = random.choice(["2BHK","3BHK"])
    plot = random.choice(plots)
    jur = random.choice(JURISDICTIONS)
    vaastu = random.random() < 0.5
    return {
        "category": "residential_single",
        "bhk": bhk,
        "plot_ft": plot,
        "jurisdiction": jur,
        "vaastu_required": vaastu,
        "rooms": ["living","kitchen","bedroom","bathroom","parking"],
        "prompt": (
            f"Design a {bhk} single-floor house on a {plot[0]}x{plot[1]}ft plot. "
            f"Include living room, kitchen, {bhk[0]} bedroom(s), bathrooms, and parking. "
            f"Jurisdiction: {jur}. "
            + ("Apply strict Vaastu Shastra compliance." if vaastu else "No Vaastu required.")
        )
    }

def make_residential_multi():
    plots = [(40,60),(45,65),(50,70),(55,75),(60,80)]
    bhk = random.choice(["4BHK","5BHK","6BHK"])
    plot = random.choice(plots)
    jur = random.choice(JURISDICTIONS)
    vaastu = random.random() < 0.5
    return {
        "category": "residential_multi",
        "bhk": bhk,
        "plot_ft": plot,
        "jurisdiction": jur,
        "vaastu_required": vaastu,
        "rooms": ["living","kitchen","bedroom","bathroom","pooja","study","servant"],
        "prompt": (
            f"Design a {bhk} multi-room house on a {plot[0]}x{plot[1]}ft plot. "
            f"Include living, kitchen, {bhk[0]} bedrooms, pooja room, study, and servant quarters. "
            f"Jurisdiction: {jur}. "
            + ("Apply strict Vaastu Shastra compliance." if vaastu else "No Vaastu required.")
        )
    }

def make_commercial():
    plots = [(50,80),(60,90),(70,100),(80,110),(100,120)]
    rooms = random.randint(8,15)
    plot = random.choice(plots)
    jur = random.choice(JURISDICTIONS)
    return {
        "category": "commercial_office",
        "room_count": rooms,
        "plot_ft": plot,
        "jurisdiction": jur,
        "vaastu_required": False,
        "fire_egress": True,
        "rooms": ["reception","open_office","cabins","conference","pantry","restrooms","server"],
        "prompt": (
            f"Design a commercial office layout on a {plot[0]}x{plot[1]}ft plot with {rooms} zones. "
            f"Include reception, open office, private cabins, conference room, pantry, restrooms, "
            f"and server room. Mandatory fire egress compliance. Jurisdiction: {jur}."
        )
    }

def make_cultural():
    plots = [(30,40),(35,45),(40,50),(45,60),(50,70)]
    bhk = random.choice(["3BHK","4BHK"])
    plot = random.choice(plots)
    jur = random.choice(JURISDICTIONS)
    conflict = random.random() < 0.35
    return {
        "category": "culturally_constrained",
        "bhk": bhk,
        "plot_ft": plot,
        "jurisdiction": jur,
        "vaastu_required": True,
        "constraint_conflict": conflict,
        "rooms": ["living","kitchen","bedroom","bathroom","pooja"],
        "prompt": (
            f"Design a strict Vaastu-compliant {bhk} house on a {plot[0]}x{plot[1]}ft plot. "
            f"Kitchen must be south-east. Master bedroom north-east. Pooja room north-east corner. "
            f"Main entrance east or north. Jurisdiction: {jur}. "
            + ("Dense layout — minimize corridors and maximize room count." if conflict else "")
        )
    }

corpus = []
random.seed(42)
generators = [make_residential_single, make_residential_multi,
              make_commercial, make_cultural]
for gen in generators:
    for _ in range(30):
        corpus.append(gen())

for i, item in enumerate(corpus):
    item["id"] = f"P{i+1:03d}"

with open("corpus.json","w") as f:
    json.dump(corpus, f, indent=2)
print(f"Generated {len(corpus)} prompts -> corpus.json")
