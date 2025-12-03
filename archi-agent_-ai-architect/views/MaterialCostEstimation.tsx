
import React, { useState, useEffect } from 'react';
import { NeoCard, NeoButton, NeoInput, NeoSelect } from '../components/NeoComponents';
import { MaterialEstimationConfig, MaterialReport, GeneratedPlan, SavedMaterialEstimate } from '../types';
import { generateMaterialEstimate } from '../services/geminiService';
import { saveMaterialEstimate, getMaterialEstimates } from '../services/storageService';
import { ChevronRight, ChevronLeft, Check, Loader2, AlertTriangle, History, Save, BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface Props {
    plan?: GeneratedPlan | null;
}

const MaterialCostEstimation: React.FC<Props> = ({ plan }) => {
    // Location dropdown options
    const STATES = ['Maharashtra', 'Karnataka', 'Gujarat', 'Tamil Nadu', 'Delhi', 'West Bengal', 'Uttar Pradesh', 'Telangana', 'Rajasthan'];
    const CITIES = ['Mumbai', 'Pune', 'Bengaluru', 'Chennai', 'Delhi', 'Kolkata', 'Hyderabad', 'Ahmedabad', 'Jaipur'];
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [selectedState, setSelectedState] = useState<string>('');
    const [view, setView] = useState<'form' | 'report' | 'history'>('form');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<MaterialReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<SavedMaterialEstimate[]>([]);

    const [config, setConfig] = useState<MaterialEstimationConfig>({
        projectType: 'Residential',
        location: '',
        dimensions: { length: 0, width: 0, floors: 1, totalArea: 0 },
        soil: { strength: 'Medium', waterProximity: false, fertility: 'Clayey', issues: [] },
        budget: { level: 'Medium', priority: 'Balanced', timeline: '', sustainability: false },
        preferences: { localSourcing: true, laborIncluded: true, extras: [], customNotes: '' }
    });

    // Auto-fill from plan if available
    useEffect(() => {
        if (plan && step === 1 && config.dimensions.totalArea === 0) {
            setConfig(prev => ({
                ...prev,
                dimensions: {
                    length: plan.totalArea ? Math.sqrt(plan.totalArea) : 0,
                    width: plan.totalArea ? Math.sqrt(plan.totalArea) : 0,
                    floors: 1, // Default
                    totalArea: plan.totalArea || 0
                }
            }));
        }
    }, [plan]);

    const loadHistory = async () => {
        const data = await getMaterialEstimates();
        setHistory(data);
    };

    const handleNext = () => setStep(prev => Math.min(prev + 1, 5));
    const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await generateMaterialEstimate(config);
            setReport(result);
            setView('report');
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate estimate");
        } finally {
            setLoading(false);
        }
    };



    const handleSave = async () => {
        if (!report) return;
        const defaultName = `${config.projectType} in ${config.location}`;
        const name = prompt('Enter a name for this estimate:', defaultName);
        if (!name) return;

        try {
            await saveMaterialEstimate({
                name,
                config,
                report
            });

            alert('Estimate saved successfully!');
            loadHistory();
        } catch (error) {
            console.error('Error saving estimate:', error);
            alert('Failed to save estimate. Please try again.');
        }
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    const renderStep1 = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold border-b-2 border-black pb-2">Step 1: Project Basics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NeoSelect
                    label="Project Type"
                    options={['Residential', 'Commercial', 'Industrial']}
                    value={config.projectType}
                    onChange={e => setConfig({ ...config, projectType: e.target.value as any })}
                />
                <div className="grid grid-cols-2 gap-3">
                    <NeoSelect
                        label="City"
                        options={CITIES}
                        value={selectedCity}
                        onChange={e => {
                            const city = e.target.value;
                            setSelectedCity(city);
                            const loc = city && selectedState ? `${city}, ${selectedState}` : city || selectedState || '';
                            setConfig({ ...config, location: loc });
                        }}
                    />
                    <NeoSelect
                        label="State"
                        options={STATES}
                        value={selectedState}
                        onChange={e => {
                            const state = e.target.value;
                            setSelectedState(state);
                            const loc = selectedCity && state ? `${selectedCity}, ${state}` : selectedCity || state || '';
                            setConfig({ ...config, location: loc });
                        }}
                    />
                </div>
                <div className="grid grid-cols-3 gap-2 col-span-1 md:col-span-2">
                    <NeoInput
                        label="Length (ft)"
                        type="number"
                        value={config.dimensions.length}
                        onChange={e => {
                            const l = Number(e.target.value);
                            setConfig({
                                ...config,
                                dimensions: { ...config.dimensions, length: l, totalArea: l * config.dimensions.width }
                            });
                        }}
                    />
                    <NeoInput
                        label="Width (ft)"
                        type="number"
                        value={config.dimensions.width}
                        onChange={e => {
                            const w = Number(e.target.value);
                            setConfig({
                                ...config,
                                dimensions: { ...config.dimensions, width: w, totalArea: config.dimensions.length * w }
                            });
                        }}
                    />
                    <NeoInput
                        label="Floors"
                        type="number"
                        value={config.dimensions.floors}
                        onChange={e => setConfig({ ...config, dimensions: { ...config.dimensions, floors: Number(e.target.value) } })}
                    />
                </div>
                <div className="col-span-1 md:col-span-2 p-3 bg-gray-100 border-2 border-dashed border-gray-400 rounded">
                    <span className="font-bold text-gray-600">Total Area: {config.dimensions.totalArea} sq.ft</span>
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold border-b-2 border-black pb-2">Step 2: Site & Soil</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NeoSelect
                    label="Soil Strength"
                    options={['Weak', 'Medium', 'Strong']}
                    value={config.soil.strength}
                    onChange={e => setConfig({ ...config, soil: { ...config.soil, strength: e.target.value as any } })}
                />
                <NeoSelect
                    label="Land Type"
                    options={['Fertile', 'Rocky', 'Clayey', 'Sandy']}
                    value={config.soil.fertility}
                    onChange={e => setConfig({ ...config, soil: { ...config.soil, fertility: e.target.value as any } })}
                />
                <div className="flex items-center gap-2 border-2 border-black p-3 bg-white">
                    <input
                        type="checkbox"
                        checked={config.soil.waterProximity}
                        onChange={e => setConfig({ ...config, soil: { ...config.soil, waterProximity: e.target.checked } })}
                        className="w-5 h-5 accent-black"
                    />
                    <label className="font-bold">Near Water Body?</label>
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="font-bold text-sm block mb-1">Known Issues</label>
                    <div className="flex gap-4 flex-wrap">
                        {['Flood-prone', 'Seismic Zone', 'Sloped Land'].map(issue => (
                            <label key={issue} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.soil.issues.includes(issue)}
                                    onChange={e => {
                                        const newIssues = e.target.checked
                                            ? [...config.soil.issues, issue]
                                            : config.soil.issues.filter(i => i !== issue);
                                        setConfig({ ...config, soil: { ...config.soil, issues: newIssues } });
                                    }}
                                    className="w-4 h-4 accent-black"
                                />
                                {issue}
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold border-b-2 border-black pb-2">Step 3: Budget & Priorities</h3>
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <label className="font-bold text-sm block mb-2">Budget Level</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['Basic', 'Medium', 'Premium', 'Luxury'].map(level => (
                            <button
                                key={level}
                                onClick={() => setConfig({ ...config, budget: { ...config.budget, level: level as any } })}
                                className={`p-3 border-2 border-black font-bold transition-all ${config.budget.level === level
                                    ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(100,100,100,1)]'
                                    : 'bg-white hover:bg-gray-100'
                                    }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>

                <NeoSelect
                    label="Priority"
                    options={['Strength-focused', 'Balanced', 'Speedy Delivery', 'Cost-optimized']}
                    value={config.budget.priority}
                    onChange={e => setConfig({ ...config, budget: { ...config.budget, priority: e.target.value } })}
                />

                <div className="flex items-center gap-2 border-2 border-black p-3 bg-white">
                    <input
                        type="checkbox"
                        checked={config.budget.sustainability}
                        onChange={e => setConfig({ ...config, budget: { ...config.budget, sustainability: e.target.checked } })}
                        className="w-5 h-5 accent-black"
                    />
                    <label className="font-bold">Prefer Eco-friendly Materials?</label>
                </div>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold border-b-2 border-black pb-2">Step 4: Additional Preferences</h3>
            <div className="space-y-4">
                <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 font-bold p-2 border-2 border-gray-200 hover:border-black transition-colors">
                        <input
                            type="checkbox"
                            checked={config.preferences.localSourcing}
                            onChange={e => setConfig({ ...config, preferences: { ...config.preferences, localSourcing: e.target.checked } })}
                            className="w-5 h-5 accent-black"
                        />
                        Prefer Local Sourcing
                    </label>
                    <label className="flex items-center gap-2 font-bold p-2 border-2 border-gray-200 hover:border-black transition-colors">
                        <input
                            type="checkbox"
                            checked={config.preferences.laborIncluded}
                            onChange={e => setConfig({ ...config, preferences: { ...config.preferences, laborIncluded: e.target.checked } })}
                            className="w-5 h-5 accent-black"
                        />
                        Include Labor Costs
                    </label>
                </div>

                <NeoInput
                    label="Custom Notes / Specific Brands"
                    value={config.preferences.customNotes}
                    onChange={e => setConfig({ ...config, preferences: { ...config.preferences, customNotes: e.target.value } })}
                    placeholder="e.g., UltraTech Cement, Tata Steel..."
                />
            </div>
        </div>
    );

    const renderStep5 = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold border-b-2 border-black pb-2">Step 5: Review & Estimate</h3>
            <div className="bg-gray-50 p-4 border-2 border-black text-sm space-y-2">
                <p><strong>Type:</strong> {config.projectType}</p>
                <p><strong>Location:</strong> {config.location || 'Not specified'}</p>
                <p><strong>Area:</strong> {config.dimensions.totalArea} sq.ft ({config.dimensions.floors} floors)</p>
                <p><strong>Soil:</strong> {config.soil.strength}, {config.soil.fertility}</p>
                <p><strong>Budget:</strong> {config.budget.level} ({config.budget.priority})</p>
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 border-2 border-blue-200 text-blue-800">
                <Check size={20} />
                <span className="font-bold text-sm">Allow AI to research real-time prices for {config.location || 'your location'}?</span>
            </div>

            <NeoButton
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-green-400 hover:bg-green-300"
            >
                {loading ? <><Loader2 className="animate-spin" /> Analyzing...</> : 'GENERATE ESTIMATE'}
            </NeoButton>
        </div>
    );

    const renderReport = () => {
        if (!report) return null;
        return (
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
                {/* Grand Total Box */}
                <div className="bg-black text-white p-8 shadow-neo border-4 border-black dark:border-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                        <BarChart2 size={120} />
                    </div>
                    <h2 className="text-3xl font-black mb-2 relative z-10">GRAND TOTAL ESTIMATE</h2>
                    <div className="text-5xl font-black text-green-400 mb-4 relative z-10">
                        {report.grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                    </div>
                    <div className="flex gap-6 text-sm relative z-10">
                        <div className="bg-white/20 px-3 py-1 rounded">
                            <span className="opacity-70">Per Sq.Ft:</span> <span className="font-bold">{report.executiveSummary.costPerSqft}</span>
                        </div>
                        <div className="bg-white/20 px-3 py-1 rounded">
                            <span className="opacity-70">Timeline:</span> <span className="font-bold">{report.executiveSummary.timelineImpact}</span>
                        </div>
                    </div>
                </div>

                {/* Quotation Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {report.quotations.map((quote, idx) => (
                        <NeoCard key={idx} className={`flex flex-col ${quote.title.includes('Interior') ? 'border-green-500 bg-green-50' : ''}`}>
                            <h3 className="font-black text-lg mb-2">{quote.title}</h3>
                            <div className="text-2xl font-bold mb-4 text-gray-800">
                                {quote.estimatedCost.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                            </div>
                            <ul className="text-sm space-y-1 mb-4 flex-1">
                                {quote.items.map((item, i) => <li key={i} className="flex items-start gap-2"><Check size={14} className="mt-1 shrink-0" /> {item}</li>)}
                            </ul>
                        </NeoCard>
                    ))}
                </div>

                {/* Visuals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <NeoCard>
                        <h3 className="font-black text-lg mb-4">Cost Distribution</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={report.visuals.costDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {report.visuals.costDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </NeoCard>

                    <NeoCard className="bg-red-50 border-red-500">
                        <h3 className="font-black text-lg mb-3 flex items-center gap-2 text-red-700">
                            <AlertTriangle size={20} /> RISKS & ALERTS
                        </h3>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                            {report.risks.map((risk, i) => <li key={i}>{risk}</li>)}
                        </ul>
                    </NeoCard>
                </div>

                {/* Detailed Breakdown */}
                <div className="space-y-4">
                    <h3 className="font-black text-2xl">DETAILED BREAKDOWN (Interior Inclusive)</h3>
                    {report.breakdown.map((cat, i) => (
                        <NeoCard key={i}>
                            <h3 className="font-black text-lg mb-3 border-b-2 border-gray-200 pb-2">{cat.category}</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 font-bold">
                                        <tr>
                                            <th className="p-2">Item</th>
                                            <th className="p-2">Quantity</th>
                                            <th className="p-2">Unit Price</th>
                                            <th className="p-2 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cat.items.map((item, j) => (
                                            <tr key={j} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="p-2 font-medium">{item.item}</td>
                                                <td className="p-2">{item.quantity}</td>
                                                <td className="p-2 text-gray-600">{item.unitPrice}</td>
                                                <td className="p-2 text-right font-bold">{item.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </NeoCard>
                    ))}
                </div>

                <div className="flex gap-4">
                    <NeoButton onClick={handleSave} className="flex-1 bg-blue-500 hover:bg-blue-400 text-white">
                        <Save size={20} /> Save to History
                    </NeoButton>
                    <NeoButton onClick={() => { setReport(null); setView('form'); }} variant="secondary" className="flex-1">
                        Start New Estimate
                    </NeoButton>
                </div>
            </div>
        );
    };

    const renderHistory = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">ESTIMATE HISTORY</h2>
                <NeoButton onClick={() => setView('form')} variant="secondary" className="px-4">
                    + New Estimate
                </NeoButton>
            </div>

            {history.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded">
                    <History size={48} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500 font-bold">No saved estimates found.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {history.map((item) => (
                        <NeoCard key={item.id} className="flex justify-between items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => { setReport(item.report); setView('report'); }}>
                            <div>
                                <h3 className="font-bold text-lg">{item.name}</h3>
                                <p className="text-sm text-gray-500">{new Date(item.date).toLocaleDateString()} • {item.config.projectType} • {item.config.location}</p>
                            </div>
                            <div className="text-right">
                                <div className="font-black text-green-600 text-xl">
                                    {item.report.grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-xs text-gray-400 font-bold">GRAND TOTAL</div>
                            </div>
                        </NeoCard>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="p-6 max-w-5xl mx-auto pb-24">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-4xl font-black mb-2">MATERIAL & COST ESTIMATOR</h1>
                    <p className="text-gray-600 font-medium">
                        Get precise, AI-powered construction estimates based on your location and preferences.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setView('form')}
                        className={`px-4 py-2 font-bold border-2 border-black ${view === 'form' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
                    >
                        New Estimate
                    </button>
                    <button
                        onClick={() => { setView('history'); loadHistory(); }}
                        className={`px-4 py-2 font-bold border-2 border-black ${view === 'history' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
                    >
                        History
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border-2 border-red-500 text-red-700 p-4 mb-6 font-bold rounded">
                    {error}
                </div>
            )}

            {view === 'form' && !report && (
                <NeoCard className="min-h-[400px] flex flex-col justify-between">
                    <div>
                        {/* Stepper Header */}
                        <div className="flex justify-between mb-8 px-2">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={`flex flex-col items-center gap-1 ${i <= step ? 'text-black' : 'text-gray-300'}`}>
                                    <div className={`
w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 
                                        ${i <= step ? 'bg-black text-white border-black' : 'bg-white border-gray-300'}
transition-all duration-300
    `}>
                                        {i}
                                    </div>
                                    <span className="text-[10px] font-bold uppercase hidden md:block">
                                        {['Basics', 'Site', 'Budget', 'Prefs', 'Review'][i - 1]}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}
                        {step === 4 && renderStep4()}
                        {step === 5 && renderStep5()}
                    </div>

                    <div className="flex justify-between mt-8 pt-4 border-t-2 border-gray-100">
                        <NeoButton
                            onClick={handleBack}
                            disabled={step === 1}
                            variant="secondary"
                            className="px-8"
                        >
                            <ChevronLeft size={20} /> Back
                        </NeoButton>

                        {step < 5 && (
                            <NeoButton onClick={handleNext} className="px-8">
                                Next <ChevronRight size={20} />
                            </NeoButton>
                        )}
                    </div>
                </NeoCard>
            )}

            {(view === 'report' || report) && renderReport()}
            {view === 'history' && renderHistory()}
        </div>
    );
};

export default MaterialCostEstimation;
