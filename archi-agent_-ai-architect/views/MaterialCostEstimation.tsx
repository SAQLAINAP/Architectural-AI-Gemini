import React from 'react';
import { GeneratedPlan } from '../types';
import { NeoCard, NeoButton } from '../components/NeoComponents';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LayoutTemplate, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MaterialCostEstimationProps {
    plan: GeneratedPlan | null;
}

const MaterialCostEstimation: React.FC<MaterialCostEstimationProps> = ({ plan }) => {
    const navigate = useNavigate();

    if (!plan) {
        return (
            <div className="max-w-7xl mx-auto p-6 text-center py-20">
                <LayoutTemplate size={64} className="mx-auto mb-4 text-gray-300" />
                <h2 className="text-2xl font-bold mb-2">No Project Data</h2>
                <p className="mb-6">Please generate or load a project to view cost estimates.</p>
                <NeoButton onClick={() => navigate('/configure')}>Start New Project</NeoButton>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            <div className="flex items-center gap-4 mb-8">
                <NeoButton onClick={() => navigate('/dashboard')} variant="secondary" className="px-3">
                    <ArrowLeft size={20} />
                </NeoButton>
                <h1 className="text-4xl font-black">MATERIAL & COST ESTIMATION</h1>
            </div>

            <div className="grid gap-8">
                <NeoCard>
                    <h3 className="text-xl font-black mb-4 dark:text-white">Cost Distribution</h3>
                    <div className="h-96 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={plan.bom}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="material" fontSize={12} tick={{ fill: 'currentColor' }} interval={0} angle={-45} textAnchor="end" height={80} className="dark:text-white" />
                                <YAxis fontSize={12} tick={{ fill: 'currentColor' }} className="dark:text-white" />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ border: '2px solid black', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }} />
                                <Bar dataKey="estimatedCost" fill="#a388ee" stroke="black" strokeWidth={2}>
                                    {plan.bom.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#a388ee' : '#ff90e8'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </NeoCard>

                <NeoCard>
                    <h3 className="text-xl font-black mb-4 dark:text-white">Bill of Materials</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-2 border-black dark:border-white">
                            <thead className="text-xs text-black uppercase bg-gray-100 dark:bg-slate-700 dark:text-white border-b-2 border-black dark:border-white">
                                <tr>
                                    <th className="px-6 py-3 border-r-2 border-black dark:border-white">Material</th>
                                    <th className="px-6 py-3 border-r-2 border-black dark:border-white">Quantity</th>
                                    <th className="px-6 py-3 border-r-2 border-black dark:border-white">Unit</th>
                                    <th className="px-6 py-3">Est. Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plan.bom.map((item, idx) => (
                                    <tr key={idx} className="bg-white dark:bg-slate-800 border-b border-black dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700 dark:text-white">
                                        <td className="px-6 py-3 font-medium border-r border-black dark:border-gray-600">{item.material}</td>
                                        <td className="px-6 py-3 border-r border-black dark:border-gray-600">{item.quantity}</td>
                                        <td className="px-6 py-3 border-r border-black dark:border-gray-600">{item.unit}</td>
                                        <td className="px-6 py-3 font-bold">${item.estimatedCost.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </NeoCard>
            </div>
        </div>
    );
};

export default MaterialCostEstimation;
