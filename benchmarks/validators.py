"""Shared deterministic validators for Vaastu and Regulatory compliance."""

VAASTU_RULES = {
    "kitchen_southeast": lambda p: any(
        r["name"].lower() in ["kitchen"] and "south" in r.get("orientation","").lower()
        and "east" in r.get("orientation","").lower()
        for r in p.get("rooms",[])),
    "master_bed_southwest": lambda p: any(
        r["name"].lower() in ["master_bedroom","bedroom_1","master bedroom"] and
        "south" in r.get("orientation","").lower()
        for r in p.get("rooms",[])),
    "entrance_east_north": lambda p: any(
        r["name"].lower() in ["entrance","main_entrance","main entrance","foyer"] and
        any(d in r.get("orientation","").lower() for d in ["east","north"])
        for r in p.get("rooms",[])),
    "bathroom_not_northeast": lambda p: not any(
        r["name"].lower() in ["bathroom","toilet","restroom","bathroom_1","bathroom 1"] and
        "north" in r.get("orientation","").lower() and
        "east" in r.get("orientation","").lower()
        for r in p.get("rooms",[])),
    "pooja_northeast": lambda p: any(
        r["name"].lower() in ["pooja","pooja_room","pooja room","prayer","prayer room"] and
        "north" in r.get("orientation","").lower() and
        "east" in r.get("orientation","").lower()
        for r in p.get("rooms",[])),
    "living_north_east": lambda p: any(
        r["name"].lower() in ["living","living_room","living room"] and
        any(d in r.get("orientation","").lower() for d in ["north","east"])
        for r in p.get("rooms",[])),
    "stairs_southwest": lambda p: (
        not any(r["name"].lower() in ["stairs","staircase"] for r in p.get("rooms",[])) or
        any(r["name"].lower() in ["stairs","staircase"] and
            "south" in r.get("orientation","").lower()
            for r in p.get("rooms",[]))),
    "dining_west": lambda p: (
        not any(r["name"].lower() in ["dining","dining_room","dining room"] for r in p.get("rooms",[])) or
        any(r["name"].lower() in ["dining","dining_room","dining room"] and
            "west" in r.get("orientation","").lower()
            for r in p.get("rooms",[]))),
    "bedroom_south_west": lambda p: any(
        "bedroom" in r["name"].lower() and
        any(d in r.get("orientation","").lower() for d in ["south","west"])
        for r in p.get("rooms",[])),
    "no_toilet_center": lambda p: not any(
        r["name"].lower() in ["bathroom","toilet","restroom"] and
        "center" in r.get("orientation","").lower()
        for r in p.get("rooms",[])),
    "open_center": lambda p: not any(
        r["name"].lower() in ["storage","store","storeroom"] and
        "center" in r.get("orientation","").lower()
        for r in p.get("rooms",[])),
    "water_northeast": lambda p: (
        not any(r["name"].lower() in ["water_tank","overhead_tank","water tank"] for r in p.get("rooms",[])) or
        any(r["name"].lower() in ["water_tank","overhead_tank","water tank"] and
            "north" in r.get("orientation","").lower()
            for r in p.get("rooms",[]))),
    "garage_southeast_northwest": lambda p: (
        not any(r["name"].lower() in ["garage","parking","car_park"] for r in p.get("rooms",[])) or
        any(r["name"].lower() in ["garage","parking","car_park"] and
            any(d in r.get("orientation","").lower() for d in ["south","north","west"])
            for r in p.get("rooms",[]))),
    "slope_northeast": lambda p: True,  # Can't validate slope from JSON alone
}

REGULATORY_RULES = {
    "min_bedroom_area": lambda p: all(
        r.get("area_sqft",0) >= 100 for r in p.get("rooms",[])
        if "bedroom" in r.get("name","").lower()),
    "min_kitchen_area": lambda p: all(
        r.get("area_sqft",0) >= 50 for r in p.get("rooms",[])
        if r.get("name","").lower() in ["kitchen"]),
    "parking_present": lambda p: any(
        r.get("name","").lower() in ["parking","garage","car_park","car park"]
        for r in p.get("rooms",[])),
    "egress_path_exists": lambda p: len(p.get("egress_paths",[])) > 0,
    "min_bathroom_area": lambda p: all(
        r.get("area_sqft",0) >= 30 for r in p.get("rooms",[])
        if r.get("name","").lower() in ["bathroom","toilet","restroom","bathroom_1","bathroom 1"]),
    "total_area_within_plot": lambda p: (
        p.get("total_area_sqft",0) <=
        p.get("plot_dimensions",{}).get("length_ft",9999) *
        p.get("plot_dimensions",{}).get("width_ft",9999) * 1.1  # 10% tolerance
    ),
}


def check_vaastu(plan, required):
    if not required:
        return 1.0, 0, []
    violations = []
    for rule_name, fn in VAASTU_RULES.items():
        try:
            if not fn(plan):
                violations.append(f"vaastu:{rule_name}")
        except:
            violations.append(f"vaastu:{rule_name}")
    score = 1.0 - len(violations)/len(VAASTU_RULES)
    return score, len(violations), violations


def check_regulatory(plan, jurisdiction):
    violations = []
    for rule_name, fn in REGULATORY_RULES.items():
        try:
            if not fn(plan):
                violations.append(f"regulatory:{rule_name}:{jurisdiction}")
        except:
            violations.append(f"regulatory:{rule_name}:{jurisdiction}")
    score = 1.0 - len(violations)/len(REGULATORY_RULES)
    return score, len(violations), violations


def compute_spatial_efficiency(plan, prompt_item):
    rooms = plan.get("rooms", [])
    total_room_area = sum(r.get("area_sqft",0) for r in rooms)
    plot_area = prompt_item["plot_ft"][0] * prompt_item["plot_ft"][1]
    if plot_area == 0:
        return 0.0
    se = total_room_area / plot_area
    corridor_area = plot_area - total_room_area
    if corridor_area / plot_area > 0.15:
        se *= 0.9
    return min(se, 1.0)
