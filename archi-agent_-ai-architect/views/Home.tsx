import React, { useRef } from 'react';
import { NeoButton, NeoCard } from '../components/NeoComponents';
import { useNavigate } from 'react-router-dom';
import { LayoutTemplate, HardHat, ScrollText, ArrowRight, Clock, Upload, FileImage, RotateCcw } from 'lucide-react';

interface HomeProps {
  onLoadProject?: () => void;
  onUploadImage?: (file: File) => void;
  isProcessing?: boolean;
}

const Home: React.FC<HomeProps> = ({ onLoadProject, onUploadImage, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUploadImage) {
      onUploadImage(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-[90%] mx-auto p-6 space-y-12">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row items-center gap-12 mt-8">
        <div className="flex-1 space-y-8">
          <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tighter">
            BUILD <br />
            <span className="text-neo-primary bg-black text-white px-2">SMARTER</span><br />
            NOT HARDER.
          </h1>
          <p className="text-xl font-medium border-l-4 border-black pl-4 py-2 bg-white/50">
            AI-powered architectural drafting. Regulatory checks included. Cultural tuning standard.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <NeoButton onClick={() => navigate('/configure')} className="text-lg px-8 py-4">
              Start New Project <ArrowRight size={24} />
            </NeoButton>

            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <NeoButton
                variant="secondary"
                className="text-lg px-8 py-4 w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                {isProcessing ? 'Analyzing...' : <><Upload size={20} /> Analyze Plan</>}
              </NeoButton>
            </div>
          </div>
          <div className="flex gap-2 items-center text-sm text-gray-600 font-bold">
            <span className="cursor-pointer hover:underline flex items-center gap-1" onClick={onLoadProject}>
              <RotateCcw size={14} /> Resume saved session
            </span>
          </div>
        </div>

        <div className="flex-1 w-full hidden md:block">
          <NeoCard className="bg-neo-accent rotate-2 transition-transform hover:rotate-0">
            <div className="aspect-video bg-white border-2 border-black flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-20 pointer-events-none">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div key={i} className="border-[0.5px] border-black"></div>
                ))}
              </div>
              <LayoutTemplate size={80} className="text-black" />
              <div className="absolute bottom-4 right-4 bg-yellow-300 border-2 border-black px-2 font-bold text-xs">V 2.0</div>
            </div>
          </NeoCard>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <NeoCard className="bg-yellow-100">
          <LayoutTemplate size={40} className="mb-4 text-neo-dark" />
          <h3 className="text-2xl font-bold mb-2">Auto-Layouts</h3>
          <p>Generate optimized floor plans instantly based on your room list and plot constraints.</p>
        </NeoCard>
        <NeoCard className="bg-pink-100">
          <FileImage size={40} className="mb-4 text-neo-dark" />
          <h3 className="text-2xl font-bold mb-2">Image Analysis</h3>
          <p>Upload existing drawings to check compliance with Vaastu and local municipal codes.</p>
        </NeoCard>
        <NeoCard className="bg-blue-100">
          <ScrollText size={40} className="mb-4 text-neo-dark" />
          <h3 className="text-2xl font-bold mb-2">Instant BOM</h3>
          <p>Get immediate material quantity takeoffs and preliminary cost estimates.</p>
        </NeoCard>
      </div>
    </div>
  );
};

export default Home;
