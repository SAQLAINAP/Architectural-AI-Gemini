import { GoogleGenAI, Type } from "@google/genai";
import { ProjectConfig, GeneratedPlan, MaterialEstimationConfig, MaterialReport, ModificationAnalysis } from '../types';

const getClient = () => {
  // Support multiple env conventions
  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    import.meta.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment. Please set VITE_GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY or GEMINI_API_KEY in .env.local");
  }
  return new GoogleGenAI({ apiKey });
};

const PRIMARY_MODEL = 'gemini-2.5-pro';
const FALLBACK_MODEL = 'gemini-2.5-flash';

const generateWithFallback = async (ai: GoogleGenAI, contents: any, config: any) => {
  try {
    console.log(`Attempting generation with ${PRIMARY_MODEL}...`);
    return await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents,
      config
    });
  } catch (error) {
    console.warn(`Model ${PRIMARY_MODEL} failed, falling back to ${FALLBACK_MODEL}. Error:`, error);
    return await ai.models.generateContent({
      model: FALLBACK_MODEL,
      contents,
      config
    });
  }
};

export const generateFloorPlan = async (config: ProjectConfig, isRegeneration: boolean = false): Promise<GeneratedPlan> => {
  const ai = getClient();

  // Construct comprehensive culturally aware directives
  let culturalDirectives = "";
  if (config.culturalSystem.includes("Vastu")) {
    culturalDirectives = `
    **VASTU SHASTRA PRINCIPLES (Apply Strictly)**:
    
    **CRITICAL - BRAHMASTHAN (Center of Plot)**:
    - Calculate: Divide plot into 9x9 grid (81 modules) or 8x8 grid (64 modules)
    - The central 9 modules (3x3) OR central 4 modules (2x2) form the Brahmasthan
    - **ABSOLUTE RULES**: 
      * NEVER place Kitchen, Toilet, Staircase, or Heavy Pillars in Brahmasthan
      * Keep open/empty - can be living room, dining, or courtyard but CENTER must be clear
      * If possible, keep open to sky with Tulsi plant or make it a hall/circulation space
      * No heavy furniture, storage, or obstructions in this sacred zone
    
    **ENTRANCE/MAIN DOOR**:
    - **MOST PREFERRED**: North or East (brings prosperity, positive energy)
    - **ACCEPTABLE**: Northeast (highly auspicious, sacred direction)
    - **AVOID**: South, Southwest (considered inauspicious)
    - If on East: Place door in 6th module from left corner (facing from outside)
    - If on North: Place in center module or one position to the right
    
    **MASTER BEDROOM**:
    - **IDEAL LOCATION**: Southwest quadrant (Earth element - stability, strength, longevity)
    - Should be the largest bedroom in the home
    - In multi-story: Place on top floor in Southwest
    - **BED PLACEMENT**: 
      * Bed in Southwest corner of the bedroom
      * Head towards South or West while sleeping (NEVER North)
      * East is also acceptable (enhances memory, peace)
    - **AVOID**: Northeast and Southeast bedrooms for master (causes health issues, conflicts)
    
    **CHILDREN'S BEDROOM**:
    - **IDEAL**: West, Northwest, or West of Southwest
    - **ALTERNATIVE**: East (for unmarried children/young students)
    - Bed head towards South or East
    - Study area should face East or North
    
    **GUEST BEDROOM**:
    - **IDEAL**: Northwest direction
    - **ALTERNATIVE**: Southeast (acceptable for guest room)
    - Bed placement: Southwest side of room, head towards South
    
    **KITCHEN**:
    - **MOST PREFERRED**: Southeast (Fire element - Agni)
    - **ALTERNATIVE**: Northwest (acceptable)
    - **COOKING STOVE**: Southeast corner, cook facing East
    - **SINK/WATER**: Northeast, North, or East side of kitchen
    - **AVOID**: 
      * North or Northeast kitchen placement
      * Kitchen directly under or above bedroom/pooja room
      * Stove and sink on same platform (Fire-Water conflict)
    
    **LIVING ROOM**:
    - **IDEAL**: Northeast, North, or East (promotes positive energy flow)
    - **AVOID**: Southwest (meant for master bedroom)
    - Heavy furniture: Place in West or Southwest of living room
    - Seating: Arrange so occupants face North or East
    
    **DINING ROOM**:
    - **IDEAL**: West, Northwest, or East
    - Dining table: Rectangular/Square shape in West or South side of room
    - Head of family should face East while eating (if possible)
    
    **POOJA/PRAYER ROOM**:
    - **MOST AUSPICIOUS**: Northeast (Ishaan Kona - Jupiter's direction, most sacred)
    - **ALTERNATIVE**: East or North
    - **STRICTLY AVOID**: South direction, under staircase
    - Idols should face East or West
    - Should not have anything built above it (no bedroom/toilet above)
    - Keep elevated from ground, well-lit with natural light
    
    **STUDY ROOM**:
    - **IDEAL**: West (especially West-Southwest), East, or Northeast
    - **STUDY TABLE**: Face East (best for focus, learning) or North while studying
    - **AVOID FACING**: South, Southwest, Southeast (causes anxiety, lack of focus)
    - Bookshelves: South or West walls
    - Keep center of room empty
    - Light colors: Light green, light blue, white, cream
    
    **TOILETS/BATHROOMS**:
    - **IDEAL LOCATIONS**: 
      * West of Northwest (best - disposal zone)
      * South of Southwest (good for removing negative energy)
      * East or Southeast (traditionally acceptable)
      * West or South (acceptable)
    - **TOILET SEAT ORIENTATION**: Face North or South while sitting (NEVER East or West)
    - **WASH BASIN/SHOWER**: East, North, or Northeast parts of bathroom
    - **WATER DRAINAGE**: Should flow towards North, East, or Northeast
    - **STRICTLY AVOID**:
      * Northeast toilets (most inauspicious - causes health/financial problems)
      * Center of house (Brahmasthan)
      * Above or below Pooja room, kitchen, or bedroom
      * Sharing wall with kitchen or pooja room
      * Facing main entrance
    - Elevate toilet 1-2 feet above ground level
    - Door: East or North direction if possible
    
    **STORAGE/CLOSETS**:
    - **IDEAL**: Southwest, South, or West walls
    - **AVOID**: Northeast corner (keep light and open)
    - Heavy items: Always in Southwest
    
    **BALCONIES**:
    - **IDEAL**: North, East, or Northeast
    - **AVOID**: Southwest or South
    
    **WATER ELEMENTS**:
    - **OVERHEAD TANKS**: Southwest or West (NEVER Northeast or North)
    - **UNDERGROUND WATER**: Northeast, North, or East
    - **AVOID**: Southeast and Southwest for water storage/wells
    
    **GENERAL VASTU PRINCIPLES**:
    - **FIVE ELEMENTS BALANCE (Pancha Bhootas)**: Earth (SW), Fire (SE), Water (NE), Air (NW), Space (Center)
    - Northeast should be kept light, open, and clutter-free (most sacred)
    - Southwest should have heavy structures, storage (provides stability)
    - North and East walls: Can have larger windows for natural light
    - South and West walls: Can be thicker, have fewer/smaller openings
    - No cuts/extensions in Northeast (very inauspicious)
    - Slopes: Floor should slope towards North or East for water drainage
    
    **FURNITURE PLACEMENT GUIDANCE FOR EACH ROOM**:
    - Master Bedroom: "Place bed in SW corner with headboard on South/West wall. Keep dressing table in North/East. Avoid mirrors facing the bed. Electronics (if any) in SE corner."
    - Kitchen: "Stove in SE corner, cook facing East. Sink in NE/North. Refrigerator in SW/South. Dining table (if in kitchen) in West/NW with seats facing E/N."
    - Living Room: "Heavy sofas in West/South. Lighter chairs in North/East. TV on South/West wall. Entrance from North/East side."
    - Study Room: "Desk facing East or North, positioned in West side of room. Bookshelf on South/West wall. Computer in SE/NW corner. Keep center clear."
    - Pooja Room: "Idols on raised platform in NE. Face East while praying. Keep oil lamp in SE corner. Incense in East."
    `;
  } else if (config.culturalSystem === 'Islamic Beliefs') {
    culturalDirectives = `
    **ISLAMIC ARCHITECTURAL PRINCIPLES**:
    - **PRIVACY (Mahram)**: Ensure visual screening between entrance and main living areas
      * Use entrance foyer, lobby, or partition to block direct view into family spaces
      * Women's areas should not be visible from main entrance
    - **QIBLA DIRECTION**: 
      * Toilets should NOT face towards Qibla (Mecca direction)
      * Prayer area/room should ideally be oriented towards Qibla
    - **GENDER SEPARATION**: If space permits, separate areas for family and guests
    - **CLEANLINESS**: Separate entrance for service areas, proper ventilation in wet areas
    - **MODESTY IN DESIGN**: Avoid excessive ornamentation, focus on functional elegance
    `;
  }

  const prompt = `
    Act as a Senior Principal Architect specializing in ${config.culturalSystem} compliant design.
    Design a technically precise, code-compliant, culturally sensitive floor plan.
    
    **PROJECT SPECIFICATIONS**:
    - Building Type: ${config.projectType}
    - Plot Dimensions: ${config.width}m (Width) x ${config.depth}m (Depth)
    - Total Plot Area: ${config.width * config.depth} sq.m
    - Floors: ${config.floors} (${config.floorPlanStyle})
    - Family Size: ${config.familyMembers} members
    - Bathrooms: ${config.bathrooms} (${config.bathroomType})
    - Kitchen: ${config.kitchenType} Style
    - Parking: ${config.parking}
    - Building Authority: ${config.municipalCode}
    - Client Requirements: ${config.requirements.join(', ')}
    - Spatial Preferences: ${config.adjacency}
    - Cultural System: ${config.culturalSystem}
    - Vastu Level: ${config.vastuLevel}
    - Site Facing: ${config.facingDirection}
    - Context: ${config.surroundingContext}

    **ARCHITECTURAL EXECUTION PROTOCOL (Systematic Approach)**:
    
    ═══════════════════════════════════════════════════════════════════
    PHASE 1: SITE ANALYSIS & ZONING (Foundation Layer)
    ═══════════════════════════════════════════════════════════════════
    
    1. **COORDINATE SYSTEM**: 
       - Origin: (0, 0) at Northwest corner
       - Extent: (0, 0) to (${config.width}, ${config.depth})
       - Total Canvas: EXACTLY ${config.width * config.depth} sq.m - EVERY SQUARE METER MUST BE ACCOUNTED FOR
    
    2. **REGULATORY SETBACKS** (Based on ${config.municipalCode}):
       - Front Setback: Typically 3m (verify for ${config.municipalCode})
       - Side Setbacks: Typically 1.5-2m each side
       - Rear Setback: Typically 2m
       - **LABEL THESE**: All setback areas MUST be marked as type: "setback"
    
    3. **BUILDABLE ENVELOPE**:
       - Calculate: Buildable Area = Total Plot - Setbacks
       - This is your construction zone for rooms/circulation
       - Document the buildable dimensions clearly
    
    4. **ZONE CLASSIFICATION MANDATE**:
       - type: "room" → Enclosed spaces with walls (bedrooms, kitchen, etc.)
       - type: "circulation" → Corridors, hallways, staircases
       - type: "outdoor" → Gardens, landscaping outside setbacks (if any space remains)
       - type: "setback" → Mandatory open space around building perimeter
       - type: "service" → Utility areas, storage outside main building
       - **CRITICAL**: NO undefined spaces. If not a room, it's circulation/outdoor/setback.
    
    ═══════════════════════════════════════════════════════════════════
    PHASE 2: CULTURAL & DIRECTIONAL PLANNING (Vastu/Cultural Layer)
    ═══════════════════════════════════════════════════════════════════
    
    ${culturalDirectives}
    
    **APPLY THESE DIRECTIVES FIRST** before functional planning.
    Document each cultural decision in designLog.
    
    ═══════════════════════════════════════════════════════════════════
    PHASE 3: FUNCTIONAL SPACE PROGRAMMING (Program Layer)
    ═══════════════════════════════════════════════════════════════════
    
    1. **SPATIAL HIERARCHY** (Entry to Private):
       - Main Entrance (from street) → Foyer/Entrance Hall
       - Foyer → Living Room (semi-public)
       - Living → Dining Room → Kitchen (family zone)
       - Private Wing: Bedrooms separated from public zones
       - Service: Toilets strategically placed per Vastu
    
    2. **MINIMUM AREAS** (Building Code Compliance):
       - Master Bedroom: ≥ 12 sq.m (typically 4m x 3m minimum)
       - Other Bedrooms: ≥ 9 sq.m
       - Kitchen: ≥ 6 sq.m (with work triangle efficiency)
       - Living Room: ≥ 12 sq.m
       - Dining: ≥ 8 sq.m (if separate)
       - Bathrooms: ≥ 3 sq.m
       - Corridors: ≥ 1.2m wide
    
    3. **CIRCULATION SPINE**:
       - Design primary corridor connecting all spaces
       - Mark as type: "circulation"
       - Ensure 1.2m minimum width for accessibility
       - **NO GAP RULE**: Circulation must fill spaces between rooms
       
    4. **MULTI-LEVEL & PARKING**:
       - If Floors > 1: Place Staircase (avoid Brahmasthan/NE). Mark as 'circulation'.
       - Parking: ${config.parking}. If 'Car', ensure minimum 2.5m x 5m space in front setback or stilt.
    
    ═══════════════════════════════════════════════════════════════════
    PHASE 4: DETAILED DESIGN & FEATURES (Execution Layer)
    ═══════════════════════════════════════════════════════════════════
    
    1. **100% COVERAGE MANDATE**:
       - Account for EVERY square meter of the ${config.width * config.depth} sq.m plot
       - Undefined white space = DESIGN FAILURE
       - Checklist: Room + Circulation + Setback + Outdoor = Total Area
    
    2. **WALL COORDINATION**:
       - Assume 230mm (0.23m) exterior walls
       - Assume 115mm (0.115m) interior partition walls
       - Adjacent rooms share wall thickness in coordinates
    
    3. **OPENINGS (Doors & Windows)**:
       - **DOORS**: 
         * Standard: 0.9m wide (residential), 1.2m (main entrance)
         * Swing: Into rooms (not into corridors)
         * Clearance: No collision with adjacent doors/furniture zones
       - **WINDOWS**:
         * Living/Bedrooms: Minimum 10% of floor area for natural light
         * Kitchen/Bathrooms: Minimum 0.6m x 0.6m for ventilation
         * North & East: Larger windows (Vastu: more openings)
         * South & West: Fewer/smaller openings
    
    4. **FURNITURE ZONES & GUIDANCE**:
       For EACH room, provide detailed "guidance" including:
       - Exact furniture placement relative to cardinal directions
       - Cultural reasoning (e.g., "SW corner bed for stability per Vastu")
       - Functional layout (e.g., "Work triangle: Stove-Sink-Fridge within 6m")
       - Storage recommendations
       - Color suggestions (if relevant)
       - **BATHROOMS**: Specify "${config.bathroomType}" type fixtures.
       - **KITCHEN**: Design as "${config.kitchenType}" layout.
    
    ═══════════════════════════════════════════════════════════════════
    PHASE 5: COMPLIANCE VALIDATION (Audit Layer)
    ═══════════════════════════════════════════════════════════════════
    
    1. **REGULATORY CHECKS**:
       - Setback compliance: Front, Side, Rear
       - FAR/FSI: (Built-up Area / Plot Area) ≤ permitted ratio
       - Room sizes: Meet minimum standards
       - Natural light: 10% floor area as window/opening
       - Ventilation: Cross-ventilation in habitable rooms
    
    2. **CULTURAL CHECKS** (If Vastu):
       - Brahmasthan: Is center kept open/light?
       - Master Bedroom: In Southwest?
       - Kitchen: In Southeast (or NW alternative)?
       - Entrance: North/East preferred?
       - Toilets: NOT in Northeast or center?
       - Each directive from cultural section above
    
    3. **DESIGN LOG DOCUMENTATION**:
       Explain your key decisions step-by-step:
       - "Applied 3m front setback per municipal code"
       - "Placed kitchen in SE quadrant for Vastu Fire element compliance"
       - "Created 1.5m corridor connecting living to bedroom wing"
       - "Kept Brahmasthan (center 9 modules) as open dining/living space"
       - "Master bedroom in SW with bed placement guidance: head South"
    
    ═══════════════════════════════════════════════════════════════════
    FINAL OUTPUT REQUIREMENTS
    ═══════════════════════════════════════════════════════════════════
    
    Generate a comprehensive JSON object with:
    - **designLog**: Array of architectural decisions (min 8-12 entries)
    - **rooms**: Complete spatial definition (NO gaps, 100% coverage)
    - **compliance**: Both regulatory and cultural validation
    - **bom**: Bill of materials with realistic quantities
    - **totalCostRange**: Estimated construction cost range
    
    **QUALITY CHECKLIST BEFORE OUTPUT**:
    ✓ All ${config.width * config.depth} sq.m accounted for?
    ✓ Cultural directives (Brahmasthan, room placement) followed?
    ✓ Minimum room areas met?
    ✓ Circulation connecting all spaces?
    ✓ Setbacks properly labeled?
    ✓ Doors swing into rooms?
    ✓ Each room has detailed furniture guidance?
    ✓ Windows provide 10% natural light?
  `;

  const response = await generateWithFallback(ai, prompt, {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        designLog: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Detailed list of architectural decisions with reasoning (8-15 entries minimum)."
        },
        rooms: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              type: {
                type: Type.STRING,
                enum: ["room", "circulation", "outdoor", "setback", "service"],
                description: "Space classification: 'room' for enclosed spaces, 'circulation' for corridors/halls, 'setback' for mandatory open areas, 'outdoor' for gardens/landscaping."
              },
              x: { type: Type.NUMBER, description: "X coordinate (meters from left)" },
              y: { type: Type.NUMBER, description: "Y coordinate (meters from top)" },
              width: { type: Type.NUMBER, description: "Width in meters" },
              height: { type: Type.NUMBER, description: "Height in meters (length in Y direction)" },
              direction: {
                type: Type.STRING,
                description: "Primary cardinal direction of room (N, NE, E, SE, S, SW, W, NW, Center)"
              },
              features: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ["door", "window", "opening"] },
                    wall: { type: Type.STRING, enum: ["top", "bottom", "left", "right"] },
                    position: { type: Type.NUMBER, description: "Distance from wall start (meters)" },
                    width: { type: Type.NUMBER, description: "Opening width (meters)" }
                  },
                  required: ["type", "wall", "position", "width"]
                }
              },
              guidance: {
                type: Type.STRING,
                description: "Comprehensive guidance: furniture placement with cardinal directions, cultural compliance reasoning (Vastu/Islamic), functional layout tips, storage recommendations, color suggestions. Example: 'Place bed in SW corner with headboard on South wall for Vastu stability. Wardrobe on West wall. Dressing table in NE. Use earthy tones (beige, brown). Avoid mirrors facing bed.'"
              }
            },
            required: ["id", "name", "type", "x", "y", "width", "height", "direction", "features", "guidance"]
          }
        },
        totalArea: { type: Type.NUMBER, description: "Total plot area (should equal width × depth)" },
        builtUpArea: { type: Type.NUMBER, description: "Sum of all 'room' type areas" },
        circulationArea: { type: Type.NUMBER, description: "Sum of all 'circulation' type areas" },
        setbackArea: { type: Type.NUMBER, description: "Sum of all 'setback' type areas" },
        plotCoverageRatio: { type: Type.NUMBER, description: "Built-up Area / Total Area (as decimal)" },
        compliance: {
          type: Type.OBJECT,
          properties: {
            regulatory: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  rule: { type: Type.STRING, description: "Building code rule checked" },
                  status: { type: Type.STRING, enum: ["PASS", "FAIL", "WARN"] },
                  message: { type: Type.STRING, description: "Compliance status details" },
                  recommendation: { type: Type.STRING, description: "Suggestions if non-compliant" }
                },
                required: ["rule", "status", "message"]
              }
            },
            cultural: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  rule: { type: Type.STRING, description: "Vastu/Cultural principle checked" },
                  status: { type: Type.STRING, enum: ["PASS", "FAIL", "WARN"] },
                  message: { type: Type.STRING, description: "Cultural compliance details" },
                  recommendation: { type: Type.STRING, description: "Remedies if non-compliant" }
                },
                required: ["rule", "status", "message"]
              }
            }
          },
          required: ["regulatory", "cultural"]
        },
        bom: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              material: { type: Type.STRING },
              quantity: { type: Type.STRING },
              unit: { type: Type.STRING },
              estimatedCost: { type: Type.NUMBER, description: "Cost in local currency" }
            },
            required: ["material", "quantity", "unit", "estimatedCost"]
          }
        },
        totalCostRange: {
          type: Type.OBJECT,
          properties: {
            min: { type: Type.NUMBER },
            max: { type: Type.NUMBER },
            currency: { type: Type.STRING, description: "INR, USD, etc." }
          },
          required: ["min", "max", "currency"]
        }
      },
      required: ["designLog", "rooms", "totalArea", "builtUpArea", "compliance", "bom", "totalCostRange"]
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from AI");
  }

  return JSON.parse(text) as GeneratedPlan;
};

export const analyzePlanFromImage = async (base64Image: string): Promise<GeneratedPlan> => {
  const ai = getClient();

  const base64Data = base64Image.split(',')[1] || base64Image;

  const prompt = `
    Analyze this architectural floor plan image with expert precision.
    
    **ANALYSIS TASKS**:
    
    1. **SPATIAL IDENTIFICATION**:
       - Identify all visible rooms, their approximate dimensions
       - Determine cardinal directions (if orientation markers visible)
       - Locate entrance, circulation paths, and service areas
    
    2. **REGULATORY COMPLIANCE ASSESSMENT**:
       - Setback adequacy (estimate if visible)
       - Natural light/ventilation (window-to-floor ratios)
       - Room minimum sizes per standard building codes
       - Circulation width adequacy
    
    3. **VASTU SHASTRA COMPLIANCE** (Apply if residential):
       - **CRITICAL CHECKS**:
         * Brahmasthan (center): Is it kept open/light? Any heavy structures?
         * Master Bedroom: Located in Southwest?
         * Kitchen: Located in Southeast or Northwest?
         * Entrance: North or East facing?
         * Toilets: NOT in Northeast or Center?
         * Pooja Room (if visible): In Northeast?
       - Rate each aspect: PASS/FAIL/WARN
    
    4. **FURNITURE PLACEMENT GUIDANCE**:
       - For each identified room, provide specific furniture placement advice
       - Include Vastu-compliant directions (e.g., "Bed head towards South in SW corner")
       - Functional recommendations (e.g., "Kitchen work triangle efficiency")
    
    5. **BILL OF MATERIALS ESTIMATION**:
       - Based on visible/estimated built-up area
       - Standard materials: Bricks, Cement, Steel, Flooring, Doors, Windows
       - Provide realistic quantity estimates
    
    **OUTPUT FORMAT**: 
    Strictly follow the JSON schema provided. Include detailed cultural compliance checks
    and comprehensive furniture guidance for each room.
  `;

  const response = await generateWithFallback(ai, {
    parts: [
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      },
      { text: prompt }
    ]
  }, {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        designLog: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Observations and analysis notes from the image"
        },
        rooms: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              type: {
                type: Type.STRING,
                enum: ["room", "circulation", "outdoor", "setback", "service"]
              },
              x: { type: Type.NUMBER, description: "Estimated X coordinate" },
              y: { type: Type.NUMBER, description: "Estimated Y coordinate" },
              width: { type: Type.NUMBER, description: "Estimated width" },
              height: { type: Type.NUMBER, description: "Estimated height" },
              direction: { type: Type.STRING, description: "Cardinal direction if determinable" },
              features: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ["door", "window", "opening"] },
                    wall: { type: Type.STRING, enum: ["top", "bottom", "left", "right"] },
                    position: { type: Type.NUMBER },
                    width: { type: Type.NUMBER }
                  }
                }
              },
              guidance: { type: Type.STRING, description: "Detailed furniture placement and Vastu guidance" }
            },
            required: ["id", "name", "type", "guidance"]
          }
        },
        totalArea: { type: Type.NUMBER, description: "Estimated total plot area" },
        builtUpArea: { type: Type.NUMBER, description: "Estimated built-up area" },
        plotCoverageRatio: { type: Type.NUMBER },
        compliance: {
          type: Type.OBJECT,
          properties: {
            regulatory: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  rule: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ["PASS", "FAIL", "WARN", "UNKNOWN"] },
                  message: { type: Type.STRING },
                  recommendation: { type: Type.STRING }
                }
              }
            },
            cultural: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  rule: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ["PASS", "FAIL", "WARN", "UNKNOWN"] },
                  message: { type: Type.STRING },
                  recommendation: { type: Type.STRING }
                }
              }
            }
          }
        },
        bom: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              material: { type: Type.STRING },
              quantity: { type: Type.STRING },
              unit: { type: Type.STRING },
              estimatedCost: { type: Type.NUMBER }
            }
          }
        },
        totalCostRange: {
          type: Type.OBJECT,
          properties: {
            min: { type: Type.NUMBER },
            max: { type: Type.NUMBER },
            currency: { type: Type.STRING }
          }
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  const plan = JSON.parse(text) as GeneratedPlan;
  plan.imageUrl = base64Image;
  return plan;
};

export const generateMaterialEstimate = async (config: MaterialEstimationConfig): Promise<MaterialReport> => {
  const ai = getClient();

  const prompt = `
    You are a expert Civil Engineer and Construction Cost Analyst with 20+ years in Indian real estate. Your task is to generate a comprehensive, non-redundant material estimation report for a building project based on user inputs. Focus on accuracy, informativeness, and decision-making insights.

    User Inputs:
    - Project Type: ${config.projectType}
    - Location: ${config.location} (use this for soil/foundation assumptions and regional pricing)
    - Dimensions: Total Area = ${config.dimensions.totalArea} sqft, Floors = ${config.dimensions.floors}
    - Soil Strength: ${config.soil.strength} (Issues: ${config.soil.issues.join(', ')})
    - Budget Level: ${config.budget.level}
    - Priority: ${config.budget.priority}
    - Preferences: Local Sourcing: ${config.preferences.localSourcing}, Labor Included: ${config.preferences.laborIncluded}
    - Notes: ${config.preferences.customNotes}

    Steps to Follow:
    1. **Research Real-Time Data**: Use web search or APIs to fetch current (as of ${new Date().toLocaleDateString()}) prices in ${config.location || 'India'}.
    2. **Calculate 3 Quotation Tiers**:
       - **Bare Shell**: Structure (RCC), Masonry, Plastering, Basic Flooring (Tiles), Basic Painting.
       - **Interior Inclusive**: All above + Premium Flooring (Marble/Granite), False Ceiling, Modular Kitchen (Basic), Wardrobes, Electrical Fixtures, Plumbing Fixtures.
       - **Fully Furnished**: All above + Loose Furniture (Sofas, Beds), Appliances (AC, TV, Fridge), Decor, Curtains, Smart Home features.
    3. **Estimate Costs**: Break down by category. Total = Materials + Labor + Misc.
    4. **Risks & Insights**: Flag issues (e.g., "Weak soil in ${config.location} risks settlement").
    5. **Output Format**: 
       - Executive Summary: Total Cost (Interior Inclusive), Per Sqft, Timeline.
       - Quotations: 3 distinct tiers with descriptions and costs.
       - Detailed Breakdown: Itemized list for the "Interior Inclusive" tier.
       - Visuals: Cost distribution data for charts.

    Ensure output is concise, uses tables for clarity, and cites sources.
  `;

  const response = await generateWithFallback(ai, prompt, {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        executiveSummary: {
          type: Type.OBJECT,
          properties: {
            totalCost: { type: Type.STRING },
            costPerSqft: { type: Type.STRING },
            timelineImpact: { type: Type.STRING }
          },
          required: ["totalCost", "costPerSqft", "timelineImpact"]
        },
        grandTotal: { type: Type.NUMBER, description: "Numeric total cost for Interior Inclusive tier" },
        quotations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              estimatedCost: { type: Type.NUMBER },
              items: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "description", "estimatedCost", "items"]
          }
        },
        breakdown: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    item: { type: Type.STRING },
                    quantity: { type: Type.STRING },
                    unitPrice: { type: Type.STRING },
                    total: { type: Type.STRING }
                  },
                  required: ["item", "quantity", "unitPrice", "total"]
                }
              }
            },
            required: ["category", "items"]
          }
        },
        visuals: {
          type: Type.OBJECT,
          properties: {
            costDistribution: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.NUMBER }
                },
                required: ["name", "value"]
              }
            }
          },
          required: ["costDistribution"]
        },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
        risks: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["executiveSummary", "grandTotal", "quotations", "breakdown", "visuals", "recommendations", "risks"]
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  return JSON.parse(text) as MaterialReport;
};

export const analyzePlanModification = async (currentPlan: GeneratedPlan, request: string, config: ProjectConfig): Promise<ModificationAnalysis> => {
  const ai = getClient();

  const prompt = `
    Analyze the feasibility of the following modification request for an architectural floor plan.
    
    **CURRENT CONTEXT**:
    - Project Type: ${config.projectType}
    - Cultural System: ${config.culturalSystem} (Vastu Level: ${config.vastuLevel})
    - Current Layout: ${currentPlan.rooms.map(r => `${r.name} (${r.width}x${r.height}m) at (${r.x},${r.y})`).join(', ')}
    
    **USER REQUEST**: "${request}"
    
    **ANALYSIS TASKS**:
    1. Check Vastu/Cultural compliance of the requested change.
    2. Check Regulatory compliance (setbacks, minimum dimensions).
    3. Assess structural/functional feasibility (e.g., moving a toilet to the center of the house).
    
    **OUTPUT**:
    Return a JSON object with:
    - feasibility: "FEASIBLE", "CAUTION", or "NOT_RECOMMENDED"
    - vastuImplications: Explanation of Vastu impact.
    - regulatoryImplications: Explanation of building code impact.
    - suggestion: A refined suggestion or alternative if the request is problematic.
    - analysis: General analysis summary.
  `;

  const response = await generateWithFallback(ai, prompt, {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        originalRequest: { type: Type.STRING },
        analysis: { type: Type.STRING },
        feasibility: { type: Type.STRING, enum: ["FEASIBLE", "CAUTION", "NOT_RECOMMENDED"] },
        vastuImplications: { type: Type.STRING },
        regulatoryImplications: { type: Type.STRING },
        suggestion: { type: Type.STRING }
      },
      required: ["analysis", "feasibility", "vastuImplications", "regulatoryImplications", "suggestion"]
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  const result = JSON.parse(text);
  result.originalRequest = request;
  return result as ModificationAnalysis;
};

export const applyPlanModification = async (currentPlan: GeneratedPlan, request: string, config: ProjectConfig): Promise<GeneratedPlan> => {
  const ai = getClient();

  // Re-construct the full context for the "Master Prompt"
  let culturalDirectives = "";
  if (config.culturalSystem.includes("Vastu")) {
    culturalDirectives = "Strictly adhere to Vastu Shastra principles as originally defined.";
  }

  const prompt = `
    Act as a Senior Principal Architect. Modify the existing floor plan based on the user's request, while maintaining all original constraints and ensuring the result is a perfect, code-compliant, culturally sensitive design.
    
    **ORIGINAL SPECIFICATIONS**:
    - Plot: ${config.width}m x ${config.depth}m
    - Requirements: ${config.requirements.join(', ')}
    - Cultural System: ${config.culturalSystem}
    
    **CURRENT PLAN STATE**:
    - Rooms: ${JSON.stringify(currentPlan.rooms)}
    
    **MODIFICATION REQUEST**: "${request}"
    
    **INSTRUCTIONS**:
    1. Apply the modification if feasible.
    2. Adjust adjacent spaces to maintain 100% plot coverage and valid circulation.
    3. Ensure all Vastu/Regulatory rules are still met.
    4. Update the 'designLog' to reflect this change.
    
    **OUTPUT**:
    Generate the complete updated 'GeneratedPlan' JSON object, following the exact same schema as the original generation.
  `;

  const response = await generateWithFallback(ai, prompt, {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        designLog: { type: Type.ARRAY, items: { type: Type.STRING } },
        rooms: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["room", "circulation", "outdoor", "setback", "service"] },
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER },
              width: { type: Type.NUMBER },
              height: { type: Type.NUMBER },
              direction: { type: Type.STRING },
              features: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ["door", "window", "opening"] },
                    wall: { type: Type.STRING, enum: ["top", "bottom", "left", "right"] },
                    position: { type: Type.NUMBER },
                    width: { type: Type.NUMBER }
                  }
                }
              },
              guidance: { type: Type.STRING }
            },
            required: ["id", "name", "type", "x", "y", "width", "height", "direction", "features", "guidance"]
          }
        },
        totalArea: { type: Type.NUMBER },
        builtUpArea: { type: Type.NUMBER },
        circulationArea: { type: Type.NUMBER },
        setbackArea: { type: Type.NUMBER },
        plotCoverageRatio: { type: Type.NUMBER },
        compliance: {
          type: Type.OBJECT,
          properties: {
            regulatory: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  rule: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ["PASS", "FAIL", "WARN"] },
                  message: { type: Type.STRING },
                  recommendation: { type: Type.STRING }
                }
              }
            },
            cultural: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  rule: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ["PASS", "FAIL", "WARN"] },
                  message: { type: Type.STRING },
                  recommendation: { type: Type.STRING }
                }
              }
            }
          }
        },
        bom: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              material: { type: Type.STRING },
              quantity: { type: Type.STRING },
              unit: { type: Type.STRING },
              estimatedCost: { type: Type.NUMBER }
            }
          }
        },
        totalCostRange: {
          type: Type.OBJECT,
          properties: {
            min: { type: Type.NUMBER },
            max: { type: Type.NUMBER },
            currency: { type: Type.STRING }
          }
        }
      },
      required: ["designLog", "rooms", "totalArea", "builtUpArea", "compliance", "bom", "totalCostRange"]
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  return JSON.parse(text) as GeneratedPlan;
};