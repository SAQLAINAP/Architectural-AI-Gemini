import React, { useState } from 'react';
import { NeoButton, NeoCard, NeoInput, NeoSelect } from '../components/NeoComponents';
import { BuildingType, CulturalSystem, MunicipalCode, ProjectConfig } from '../types';
import { ArrowLeft, Sparkles, Plus, Trash2, ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ConfigurationProps {
  onGenerate: (config: ProjectConfig) => void;
  isGenerating: boolean;
}

const Configuration: React.FC<ConfigurationProps> = ({ onGenerate, isGenerating }) => {
  const navigate = useNavigate();

  // Stepper State
  const [currentStep, setCurrentStep] = useState(1);
  const TOTAL_STEPS = 3;

  // Form State
  const [projectType, setProjectType] = useState<BuildingType>(BuildingType.RESIDENTIAL);
  const [width, setWidth] = useState<number | ''>('');
  const [depth, setDepth] = useState<number | ''>('');
  const [requirements, setRequirements] = useState<string[]>([]);
  const [newReq, setNewReq] = useState("");
  const [adjacency, setAdjacency] = useState("");
  const [culturalSystem, setCulturalSystem] = useState<CulturalSystem>('' as CulturalSystem);
  const [vastuLevel, setVastuLevel] = useState<'None' | 'Slightly' | 'Moderately' | 'Strictly' | ''>('');
  const [facingDirection, setFacingDirection] = useState('');
  const [surroundingContext, setSurroundingContext] = useState('');

  // Advanced Params
  const [floors, setFloors] = useState<number | ''>('');
  const [floorPlanStyle, setFloorPlanStyle] = useState<'Simplex' | 'Duplex' | 'Triplex' | ''>('');
  const [bathrooms, setBathrooms] = useState<number | ''>('');
  const [bathroomType, setBathroomType] = useState<'Western' | 'Indian' | 'Mixed' | ''>('');
  const [parking, setParking] = useState<'None' | 'Bike Only' | '1 Car' | '2+ Cars' | ''>('');
  const [kitchenType, setKitchenType] = useState<'Open' | 'Closed' | ''>('');
  const [familyMembers, setFamilyMembers] = useState<number | ''>('');

  const [municipalCode, setMunicipalCode] = useState<MunicipalCode>('' as MunicipalCode);

  const handleAddReq = () => {
    if (newReq.trim()) {
      setRequirements([...requirements, newReq.trim()]);
      setNewReq("");
    }
  };

  const handleRemoveReq = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const handleGenerate = () => {
    onGenerate({
      projectType,
      width,
      depth,
      requirements,
      adjacency,
      culturalSystem,
      vastuLevel,
      facingDirection,
      surroundingContext,
      floors,
      floorPlanStyle,
      bathrooms,
      bathroomType,
      parking,
      kitchenType,
      familyMembers,
      municipalCode,
    });
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`
w - 10 h - 10 rounded - full flex items - center justify - center font - bold border - 2 border - black
            ${currentStep === step ? 'bg-neo-primary text-black' : currentStep > step ? 'bg-green-400 text-black' : 'bg-white text-gray-400'}
`}>
            {currentStep > step ? <Check size={20} /> : step}
          </div>
          {step < 3 && (
            <div className={`w - 16 h - 1 border - t - 2 border - black ${currentStep > step ? 'border-solid' : 'border-dashed'} `}></div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-[90%] mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <NeoButton onClick={() => navigate('/')} variant="secondary" className="px-3">
          <ArrowLeft size={20} />
        </NeoButton>
        <h1 className="text-4xl font-black">CONFIGURE PROJECT</h1>
      </div>

      {renderStepIndicator()}

      <div className="max-w-4xl mx-auto">
        {/* Step 1: Scope */}
        {currentStep === 1 && (
          <NeoCard className="bg-white animate-in fade-in slide-in-from-right-8">
            <h2 className="text-2xl font-black mb-4 bg-black text-white inline-block px-2">1. SCOPE</h2>
            <div className="space-y-6">
              <NeoSelect
                label="Project Type"
                options={Object.values(BuildingType)}
                value={projectType}
                onChange={(e) => setProjectType(e.target.value as BuildingType)}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <NeoInput
                    label="Plot Width (m)"
                    type="number"
                    value={width}
                    placeholder="e.g. 12"
                    onChange={(e) => setWidth(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {[12, 15, 18, 20].map(w => (
                      <button key={w} onClick={() => setWidth(w)} className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded border border-black">{w}m</button>
                    ))}
                  </div>
                </div>
                <div>
                  <NeoInput
                    label="Plot Depth (m)"
                    type="number"
                    value={depth}
                    placeholder="e.g. 18"
                    onChange={(e) => setDepth(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {[15, 18, 24, 30].map(d => (
                      <button key={d} onClick={() => setDepth(d)} className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded border border-black">{d}m</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NeoInput
                  label="Floors"
                  type="number"
                  min={1}
                  max={5}
                  value={floors}
                  placeholder="e.g. 1"
                  onChange={(e) => setFloors(e.target.value === '' ? '' : Number(e.target.value))}
                />
                <NeoSelect
                  label="Style"
                  options={['Simplex', 'Duplex', 'Triplex']}
                  value={floorPlanStyle}
                  onChange={(e) => setFloorPlanStyle(e.target.value as any)}
                />
                <NeoSelect
                  label="Parking"
                  options={['None', 'Bike Only', '1 Car', '2+ Cars']}
                  value={parking}
                  onChange={(e) => setParking(e.target.value as any)}
                />
                <NeoInput
                  label="Family Members"
                  type="number"
                  value={familyMembers}
                  placeholder="e.g. 4"
                  onChange={(e) => setFamilyMembers(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              <div>
                <label className="font-bold text-sm block mb-1">Room Requirements</label>
                <div className="flex gap-2 mb-2">
                  <input
                    className="flex-1 bg-white border-2 border-black p-2 focus:outline-none"
                    value={newReq}
                    onChange={(e) => setNewReq(e.target.value)}
                    placeholder="e.g. Puja Room"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddReq()}
                  />
                  <button onClick={handleAddReq} className="bg-black text-white p-2 hover:bg-gray-800">
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {["Study Room", "Guest Room", "Store Room", "Utility Area", "Balcony"].map(req => (
                    <button key={req} onClick={() => { if (!requirements.includes(req)) setRequirements([...requirements, req]) }} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded border border-gray-400">+ {req}</button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {requirements.map((req, i) => (
                    <span key={i} className="bg-gray-200 border border-black px-2 py-1 text-sm flex items-center gap-1 font-medium">
                      {req}
                      <Trash2 size={12} className="cursor-pointer hover:text-red-600" onClick={() => handleRemoveReq(i)} />
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex gap-2 items-end">
                  <NeoInput
                    label="Bathrooms"
                    type="number"
                    value={bathrooms}
                    placeholder="e.g. 2"
                    onChange={(e) => setBathrooms(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-20"
                  />
                  <NeoSelect
                    label="Type"
                    options={['Western', 'Indian', 'Mixed']}
                    value={bathroomType}
                    onChange={(e) => setBathroomType(e.target.value as any)}
                    className="flex-1"
                  />
                </div>
                <NeoSelect
                  label="Kitchen Style"
                  options={['Open', 'Closed']}
                  value={kitchenType}
                  onChange={(e) => setKitchenType(e.target.value as any)}
                />
              </div>

              <div>
                <label className="font-bold text-sm block mb-1">Adjacency & Orientation</label>
                <textarea
                  className="w-full h-24 bg-white border-2 border-black p-3 focus:outline-none shadow-inner resize-none"
                  value={adjacency}
                  onChange={(e) => setAdjacency(e.target.value)}
                  placeholder="e.g. Kitchen near Dining. Living facing North."
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    "Kitchen in SE", "Master Bed in SW", "Entrance in NE",
                    "Living facing North", "Stairs in West"
                  ].map(adj => (
                    <button
                      key={adj}
                      onClick={() => setAdjacency(prev => prev ? `${prev} ${adj}.` : `${adj}.`)}
                      className="text-xs bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 text-blue-800"
                    >
                      + {adj}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </NeoCard>
        )}

        {/* Step 2: Culture */}
        {currentStep === 2 && (
          <NeoCard className="bg-pink-50 animate-in fade-in slide-in-from-right-8">
            <h2 className="text-2xl font-black mb-4 bg-neo-secondary text-black inline-block px-2">2. CULTURE & SITE</h2>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <NeoSelect
                  label="Belief System"
                  options={Object.values(CulturalSystem)}
                  value={culturalSystem}
                  onChange={(e) => setCulturalSystem(e.target.value as CulturalSystem)}
                />
                <NeoSelect
                  label="Vastu Preference Level"
                  options={['None', 'Slightly', 'Moderately', 'Strictly']}
                  value={vastuLevel}
                  onChange={(e) => setVastuLevel(e.target.value as any)}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <NeoSelect
                  label="Site Facing Direction"
                  options={['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West']}
                  value={facingDirection}
                  onChange={(e) => setFacingDirection(e.target.value)}
                />
              </div>

              <div>
                <label className="font-bold text-sm block mb-1">Surrounding Context</label>
                <textarea
                  className="w-full h-24 bg-white border-2 border-black p-3 focus:outline-none shadow-inner resize-none"
                  placeholder="Describe neighbors, roads, or views (e.g., 'Park to the North', 'Tall building on West side')"
                  value={surroundingContext}
                  onChange={(e) => setSurroundingContext(e.target.value)}
                />
              </div>

              <p className="text-sm border-l-2 border-black pl-2 italic">
                The AI will prioritize layouts that conform to the cardinal directions and quadrant rules of the selected system, while considering site constraints.
              </p>
            </div>
          </NeoCard>
        )}

        {/* Step 3: Compliance */}
        {currentStep === 3 && (
          <NeoCard className="bg-blue-50 animate-in fade-in slide-in-from-right-8">
            <h2 className="text-2xl font-black mb-4 bg-neo-accent text-black inline-block px-2">3. COMPLIANCE</h2>
            <div className="space-y-4">
              <NeoSelect
                label="Municipal Authority"
                options={Object.values(MunicipalCode)}
                value={municipalCode}
                onChange={(e) => setMunicipalCode(e.target.value as MunicipalCode)}
              />
              <p className="text-sm border-l-2 border-black pl-2 italic">
                Checks for Setbacks, Floor Area Ratio (FAR), and Minimum dimensions based on local by-laws.
              </p>
            </div>
          </NeoCard>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <NeoButton
            onClick={prevStep}
            disabled={currentStep === 1}
            variant="secondary"
            className={currentStep === 1 ? 'invisible' : ''}
          >
            <ArrowLeft size={20} /> Back
          </NeoButton>

          {currentStep < TOTAL_STEPS ? (
            <NeoButton onClick={nextStep}>
              Next Step <ArrowRight size={20} />
            </NeoButton>
          ) : (
            <NeoButton
              onClick={handleGenerate}
              className="bg-black text-white hover:bg-gray-800 hover:text-white border-black"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <span className="animate-pulse">Thinking...</span>
              ) : (
                <>
                  <Sparkles size={24} className="text-yellow-400" /> GENERATE PLANS
                </>
              )}
            </NeoButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default Configuration;