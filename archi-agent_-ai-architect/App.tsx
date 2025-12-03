import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ProjectConfig, GeneratedPlan, SavedProject, ModificationAnalysis } from './types';
import { AuthProvider } from './contexts/AuthContext';
import Login from './views/Login';
import ForgotPassword from './views/ForgotPassword';
import ResetPassword from './views/ResetPassword';
import Home from './views/Home';
import Configuration from './views/Configuration';
import Dashboard from './views/Dashboard';
import OverviewDashboard from './views/OverviewDashboard';
import Projects from './views/Projects';
import MaterialCostEstimation from './views/MaterialCostEstimation';
import Documentation from './views/Documentation';
import { generateFloorPlan, analyzePlanFromImage, analyzePlanModification, applyPlanModification } from './services/geminiService';
import { saveProject, saveFloorPlan, FloorPlanData } from './services/storageService';
import { Navbar } from './components/NeoComponents';
import ProtectedRoute from './components/ProtectedRoute';

import ResumeModal from './views/ResumeModal';

function App() {
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [planHistory, setPlanHistory] = useState<GeneratedPlan[]>([]);
  const [currentPlanIndex, setCurrentPlanIndex] = useState<number>(-1);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [lastSessionTime, setLastSessionTime] = useState<string>("");
  const navigate = useNavigate();

  const generatedPlan = currentPlanIndex >= 0 ? planHistory[currentPlanIndex] : null;

  // Session Persistence Key
  const SESSION_KEY = 'archi_current_session';

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

    // Check for saved session
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.config && session.planHistory && session.planHistory.length > 0) {
          setLastSessionTime(session.timestamp || new Date().toISOString());
          setShowResumeModal(true);
        }
      } catch (e) {
        console.error("Failed to parse saved session", e);
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  // Auto-save session
  useEffect(() => {
    if (config && planHistory.length > 0) {
      const session = {
        config,
        planHistory,
        currentPlanIndex,
        currentProjectId,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }, [config, planHistory, currentPlanIndex, currentProjectId]);

  const handleResumeSession = () => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      const session = JSON.parse(savedSession);
      setConfig(session.config);
      setPlanHistory(session.planHistory);
      setCurrentPlanIndex(session.currentPlanIndex);
      setCurrentProjectId(session.currentProjectId);
      setShowResumeModal(false);
      navigate('/dashboard');
    }
  };

  const handleDiscardSession = () => {
    localStorage.removeItem(SESSION_KEY);
    setShowResumeModal(false);
  };

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
      plan.version = "1.0";
      plan.timestamp = Date.now();

      setPlanHistory([plan]);
      setCurrentPlanIndex(0);

            // Save floor plan to Supabase
            try {
              const savedFloorPlan = await saveFloorPlan({
                name: `${newConfig.buildingType} - ${new Date().toLocaleDateString()}`,
                version: 1,
                config: newConfig,
                planData: plan,
                sourceType: 'generated',
                generationModel: 'gemini-2.0-flash-exp',
                generationParams: {
                  buildingType: newConfig.buildingType,
                  sqft: newConfig.sqft,
                  floors: newConfig.floors,
                  bedrooms: newConfig.bedrooms,
                  bathrooms: newConfig.bathrooms
                },
                status: 'completed'
              });
              setCurrentProjectId(savedFloorPlan.id);
            } catch (saveError) {
              console.error('Error saving floor plan:', saveError);
              // Continue to dashboard even if save fails
            }

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

                // Save analyzed floor plan to Supabase
                try {
                  const savedFloorPlan = await saveFloorPlan({
                    name: `Analyzed Plan - ${file.name}`,
                    version: 1,
                    config: config || {}, // May not have config for analyzed images
                    planData: plan,
                    sourceType: 'analyzed_image',
                    sourceImageUrl: base64, // Store the image data URL
                    generationModel: 'gemini-2.0-flash-exp',
                    status: 'completed'
                  });
                  setCurrentProjectId(savedFloorPlan.id);
                } catch (saveError) {
                  console.error('Error saving analyzed floor plan:', saveError);
                  // Continue to dashboard even if save fails
                }

        plan.version = "1.0";
        plan.timestamp = Date.now();

        setPlanHistory([plan]);
        setCurrentPlanIndex(0);
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
        config: config!,
        plan: generatedPlan // Save current version
      };

      saveProject(newProject);
      setCurrentProjectId(newProject.id);
      // Clear session after successful save (optional, but good practice to avoid stale resume)
      // localStorage.removeItem(SESSION_KEY); 
      alert("Project saved successfully!");
    }
  };

  const handleLoadSavedProject = (project: SavedProject) => {
    setConfig(project.config);
    setPlanHistory([project.plan]);
    setCurrentPlanIndex(0);
    setCurrentProjectId(project.id);
    navigate('/dashboard');
  };

  const handleRegenerate = async () => {
    if (config) {
      setIsProcessing(true);
      try {
        // Calculate new major version
        const currentVersion = generatedPlan?.version || "1.0";
        const major = parseInt(currentVersion.split('.')[0]) + 1;
        const newVersion = `${major}.0`;

        const plan = await generateFloorPlan(config, true); // Pass true for regeneration optimization
        plan.version = newVersion;
        plan.timestamp = Date.now();

        setPlanHistory(prev => [...prev, plan]);
        setCurrentPlanIndex(prev => prev + 1);

              // Save regenerated floor plan
              try {
                const savedFloorPlan = await saveFloorPlan({
                  name: `${config.buildingType} - Regenerated v${major}`,
                  version: major,
                  config: config,
                  planData: plan,
                  sourceType: 'generated',
                  parentPlanId: currentProjectId || undefined,
                  generationModel: 'gemini-2.0-flash-exp',
                  generationParams: {
                    buildingType: config.buildingType,
                    sqft: config.sqft,
                    floors: config.floors,
                    bedrooms: config.bedrooms,
                    bathrooms: config.bathrooms,
                    isRegeneration: true
                  },
                  status: 'completed'
                });
                setCurrentProjectId(savedFloorPlan.id);
              } catch (saveError) {
                console.error('Error saving regenerated floor plan:', saveError);
              }

      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to regenerate.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleAnalyzeModification = async (request: string): Promise<ModificationAnalysis> => {
    if (!generatedPlan || !config) throw new Error("No active plan to modify");
    return await analyzePlanModification(generatedPlan, request, config);
  };

  const handleApplyModification = async (request: string) => {
    if (!generatedPlan || !config) return;
    setIsProcessing(true);
    try {
      const newPlan = await applyPlanModification(generatedPlan, request, config);

      // Calculate new minor version
      const currentVersion = generatedPlan.version || "1.0";
      const [major, minor] = currentVersion.split('.').map(Number);
      const newVersion = `${major}.${minor + 1}`;

      newPlan.version = newVersion;
      newPlan.timestamp = Date.now();

      setPlanHistory(prev => [...prev, newPlan]);

            // Save modified floor plan as new version
            try {
              const savedFloorPlan = await saveFloorPlan({
                name: `Modified - ${new Date().toLocaleString()}`,
                version: minor + 1,
                config: config,
                planData: newPlan,
                sourceType: 'modified',
                parentPlanId: currentProjectId || undefined,
                generationModel: 'gemini-2.0-flash-exp',
                generationParams: {
                  modificationType: 'user_modification',
                  modificationRequest: request
                },
                status: 'completed'
              });
              setCurrentProjectId(savedFloorPlan.id);
            } catch (saveError) {
              console.error('Error saving modified floor plan:', saveError);
            }

      setCurrentPlanIndex(prev => prev + 1);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to apply modification.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVersionChange = (index: number) => {
    setCurrentPlanIndex(index);
  };

  return (
    <AuthProvider>
      <div className={`min-h-screen bg-neo-bg dark:bg-slate-900 transition-colors font-sans text-black dark:text-white ${isDark ? 'dark' : ''}`}>
        <Navbar isDark={isDark} toggleTheme={toggleTheme} />

        <ResumeModal
          isOpen={showResumeModal}
          onResume={handleResumeSession}
          onDiscard={handleDiscardSession}
          lastSaved={lastSessionTime}
        />

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
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={
              <Home
                onLoadProject={() => navigate('/projects')}
                onUploadImage={handleUploadImage}
                isProcessing={isProcessing}
              />
            } />
            <Route path="/overview" element={
              <ProtectedRoute>
                <OverviewDashboard />
              </ProtectedRoute>
            } />
            <Route path="/configure" element={
              <ProtectedRoute>
                <Configuration
                  onGenerate={handleGenerate}
                  isGenerating={isProcessing}
                />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard
                  plan={generatedPlan}
                  onSave={handleSaveProject}
                  onRegenerate={handleRegenerate}
                  onAnalyzeModification={handleAnalyzeModification}
                  onApplyModification={handleApplyModification}
                  isProcessing={isProcessing}
                  planHistory={planHistory}
                  currentPlanIndex={currentPlanIndex}
                  onVersionChange={handleVersionChange}
                />
              </ProtectedRoute>
            } />
            <Route path="/materials" element={
              <ProtectedRoute>
                <MaterialCostEstimation plan={generatedPlan} />
              </ProtectedRoute>
            } />
            <Route path="/projects" element={
              <ProtectedRoute>
                <Projects
                  onLoadProject={handleLoadSavedProject}
                />
              </ProtectedRoute>
            } />
            <Route path="/docs" element={<Documentation />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;