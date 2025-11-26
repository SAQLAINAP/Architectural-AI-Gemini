
import React from 'react';
import { NeoCard } from '../components/NeoComponents';
import { AlertTriangle, Info, ShieldAlert, Calculator, Map } from 'lucide-react';

const Documentation = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="mb-8">
        <h1 className="text-5xl font-black mb-4">DOCUMENTATION</h1>
        <p className="text-xl border-l-4 border-black pl-4 py-2 bg-white/50">
           A guide to using ArchAI, understanding its logic, and interpreting its results.
        </p>
      </div>

      <section className="space-y-4">
         <h2 className="text-3xl font-black flex items-center gap-2">
            <Info className="bg-black text-white p-1 rounded-sm" size={32} /> 
            How to Use
         </h2>
         <NeoCard>
            <ol className="list-decimal pl-5 space-y-3 font-medium">
               <li><strong>Create a Project:</strong> Go to 'New Project', specify your plot dimensions, building type, and room requirements.</li>
               <li><strong>Set Parameters:</strong> Choose your Cultural system (e.g., Vastu) and Local Municipal Code (e.g., BBMP) for compliance checks.</li>
               <li><strong>Generate:</strong> Click 'Generate' to let the AI draft a technical floor plan.</li>
               <li><strong>Refine:</strong> Use the Dashboard to inspect the plan, measure distances, and view the Bill of Materials (BOM).</li>
               <li><strong>Save & Export:</strong> Save your project to 'My Projects' or print the report directly.</li>
            </ol>
         </NeoCard>
      </section>

      <section className="space-y-4">
         <h2 className="text-3xl font-black flex items-center gap-2">
            <ShieldAlert className="bg-red-500 text-white p-1 rounded-sm" size={32} /> 
            Disclaimer & Stability
         </h2>
         <NeoCard className="bg-red-50 border-red-900">
            <div className="flex gap-4">
               <AlertTriangle size={48} className="text-red-600 flex-shrink-0" />
               <div>
                  <h3 className="text-xl font-bold mb-2 text-red-900">Product Stability Warning</h3>
                  <p className="text-sm mb-4">
                     ArchAI is currently in <strong>Beta</strong>. The floor plans generated are algorithmic approximations and <strong>do not replace professional architectural or structural engineering advice</strong>.
                  </p>
                  <ul className="list-disc pl-4 text-sm space-y-1 text-red-800">
                     <li>Do not use these plans directly for construction without expert verification.</li>
                     <li>Structural integrity (columns, beams, foundations) is NOT calculated by this tool.</li>
                     <li>Material costs are rough estimates based on regional averages and may fluctuate significantly.</li>
                  </ul>
               </div>
            </div>
         </NeoCard>
      </section>

      <section className="space-y-4">
         <h2 className="text-3xl font-black flex items-center gap-2">
            <Calculator className="bg-neo-primary text-black p-1 rounded-sm" size={32} /> 
            Logic & Calculations
         </h2>
         <div className="grid md:grid-cols-2 gap-6">
            <NeoCard>
               <h3 className="text-lg font-black mb-2">Vaastu Score Mechanism</h3>
               <p className="text-sm text-gray-700 mb-2">
                  The Cultural Compliance engine checks the placement of key rooms against cardinal directions based on ancient texts.
               </p>
               <ul className="text-xs space-y-2 bg-gray-100 p-3 border border-black">
                  <li><strong>Kitchen:</strong> Preferred SE (Agni) or NW (Vayu). Score penalty if in NE/SW.</li>
                  <li><strong>Master Bedroom:</strong> Preferred SW (Earth). Score penalty if in NE.</li>
                  <li><strong>Entrance:</strong> Checked against positive quadrants (Padas).</li>
               </ul>
            </NeoCard>
            
            <NeoCard>
               <h3 className="text-lg font-black mb-2">Cost Estimation</h3>
               <p className="text-sm text-gray-700 mb-2">
                  Costs are derived from a baseline per-square-foot rate adjusted for the 'Building Type'.
               </p>
               <ul className="text-xs space-y-2 bg-gray-100 p-3 border border-black">
                  <li><strong>Base Rate:</strong> ~$18/sq.ft (Residential Standard).</li>
                  <li><strong>Modifiers:</strong> +20% for Commercial, +15% for Complex Geometry.</li>
                  <li><strong>BOM:</strong> Derived from volumetric analysis (Wall length x Height x Thickness) + Slab area.</li>
               </ul>
            </NeoCard>
         </div>
      </section>

      <section className="space-y-4">
         <h2 className="text-3xl font-black flex items-center gap-2">
            <Map className="bg-neo-accent text-black p-1 rounded-sm" size={32} /> 
            Citations & Compliance
         </h2>
         <NeoCard className="bg-blue-50">
            <p className="mb-4 font-medium">Regulatory checks are based on open-source data from the following municipal by-laws:</p>
            <ul className="space-y-2 text-sm">
               <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                  <a href="#" className="underline hover:text-blue-600">Bruhat Bengaluru Mahanagara Palike (BBMP) Building Bye-Laws 2003</a>
               </li>
               <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                  <a href="#" className="underline hover:text-blue-600">Unified Development Control and Promotion Regulations (UDCPR) for Maharashtra (BMC)</a>
               </li>
               <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                  <a href="#" className="underline hover:text-blue-600">Delhi Municipal Corporation (MCD) Building Bye-Laws 2016</a>
               </li>
               <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                  <a href="#" className="underline hover:text-blue-600">National Building Code of India (NBC 2016)</a>
               </li>
            </ul>
         </NeoCard>
      </section>

      <div className="text-center pt-8 pb-12 text-gray-500 text-sm">
         &copy; 2024 ArchAI. All rights reserved.
      </div>
    </div>
  );
};

export default Documentation;
