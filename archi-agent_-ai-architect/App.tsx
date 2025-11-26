import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ProjectConfig, GeneratedPlan, SavedProject } from './types';
import Home from './views/Home';
import Configuration from './views/Configuration';
import Dashboard from './views/Dashboard';
import Projects from './views/Projects';
import MaterialCostEstimation from './views/MaterialCostEstimation';
import Documentation from './views/Documentation';
import { generateFloorPlan, analyzePlanFromImage } from './services/geminiService';
import { saveProject } from './services/storageService';
import { Navbar } from './components/NeoComponents';

function App() {
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check system preference or localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const newTheme = !prev;
      if (newTheme) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return newTheme;
    });
  };

  const handleGenerate = async (newConfig: ProjectConfig) => {
    setConfig(newConfig);
    setIsProcessing(true);
    setError(null);
    setCurrentProjectId(null); // Reset current ID for new generation
    try {
      const plan = await generateFloorPlan(newConfig);
      setGeneratedPlan(plan);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate plan. Please check API key or try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadImage = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setCurrentProjectId(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const plan = await analyzePlanFromImage(base64);
        setGeneratedPlan(plan);
        navigate('/dashboard');
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to analyze image.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setError("Failed to read file.");
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProject = () => {
    if (generatedPlan) {
      const name = prompt("Enter a name for your project:", "My Dream House");
      if (!name) return;

      const newProject: SavedProject = {
        id: currentProjectId || crypto.randomUUID(),
        name: name,
        date: new Date().toISOString(),
        config: config,
        plan: generatedPlan
      };

      saveProject(newProject);
      setCurrentProjectId(newProject.id);
      alert("Project saved successfully!");
    }
  };

  const handleLoadSavedProject = (project: SavedProject) => {
    setConfig(project.config);
    setGeneratedPlan(project.plan);
    setCurrentProjectId(project.id);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen font-sans flex flex-col transition-colors duration-300">
      <Navbar isDark={isDark} toggleTheme={toggleTheme} />

      {/* Error Toast */}
      {error && (
        <div className="fixed top-20 right-4 z-50 bg-red-100 dark:bg-red-900 border-2 border-black dark:border-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] max-w-sm">
          <h4 className="font-bold text-red-600 dark:text-red-300 mb-1">Error</h4>
          <p className="text-sm dark:text-white">{error}</p>
          <button onClick={() => setError(null)} className="absolute top-1 right-1 font-bold text-xs px-2 hover:bg-red-200 dark:hover:bg-red-800 dark:text-white">X</button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={
            <Home
              onLoadProject={() => navigate('/projects')}
              onUploadImage={handleUploadImage}
              isProcessing={isProcessing}
            />
          } />
          <Route path="/configure" element={
            <Configuration
              onGenerate={handleGenerate}
              isGenerating={isProcessing}
            />
          } />
          <Route path="/dashboard" element={
            <Dashboard
              plan={generatedPlan}
              onSave={handleSaveProject}
            />
          } />
          <Route path="/materials" element={<MaterialCostEstimation plan={generatedPlan} />} /> {/* Added MaterialCostEstimation route */}
          <Route path="/projects" element={
            <Projects
              onLoadProject={handleLoadSavedProject}
            />
          } />
          <Route path="/docs" element={<Documentation />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;