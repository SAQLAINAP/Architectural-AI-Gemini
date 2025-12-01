
import { SavedProject, ProjectConfig, GeneratedPlan } from '../types';
import { supabase } from '../lib/supabaseClient';

const STORAGE_KEY = 'archi_projects'; // Updated to match new local storage key

export const saveProject = async (project: Omit<SavedProject, 'id' | 'date'>): Promise<SavedProject> => {
  let user = null;
  try {
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    }
  } catch (e) {
    console.warn("Supabase auth check failed:", e);
  }

  if (user && supabase) {
    // Save to Supabase
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: project.name,
        data: project
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving to Supabase:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      date: data.created_at,
      config: data.data.config,
      plan: data.data.plan
    };
  } else {
    // Fallback to LocalStorage
    const projects = getSavedProjectsLocal();
    const newProject: SavedProject = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      ...project
    };
    projects.push(newProject);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return newProject;
  }
};

export const getSavedProjects = async (): Promise<SavedProject[]> => {
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (user && supabase) {
    // Fetch from Supabase
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching from Supabase:', error);
      return getSavedProjectsLocal(); // Fallback
    }

    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      date: p.created_at,
      config: p.data.config,
      plan: p.data.plan
    }));
  } else {
    return getSavedProjectsLocal();
  }
};

const getSavedProjectsLocal = (): SavedProject[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const deleteProject = async (id: string): Promise<void> => {
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (user && supabase) {
    await supabase.from('projects').delete().eq('id', id);
  }

  // Also delete from local to be safe/consistent if mixed usage
  const projects = getSavedProjectsLocal().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

export const getProjectById = async (id: string): Promise<SavedProject | undefined> => {
  const projects = await getSavedProjects();
  return projects.find(p => p.id === id);
};

// --- Material Estimates ---

const ESTIMATES_KEY = 'archi_estimates';

export const saveMaterialEstimate = async (name: string, config: any, report: any): Promise<void> => {
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (user && supabase) {
    const { error } = await supabase
      .from('material_estimates')
      .insert({
        user_id: user.id,
        name,
        config,
        report
      });
    if (error) console.error('Error saving estimate to Supabase:', error);
  } else {
    // Local Fallback
    const estimates = getMaterialEstimatesLocal();
    estimates.push({
      id: crypto.randomUUID(),
      name,
      date: new Date().toISOString(),
      config,
      report
    });
    localStorage.setItem(ESTIMATES_KEY, JSON.stringify(estimates));
  }
};

export const getMaterialEstimates = async (): Promise<any[]> => {
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (user && supabase) {
    const { data, error } = await supabase
      .from('material_estimates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching estimates:', error);
      return getMaterialEstimatesLocal();
    }
    return data.map((e: any) => ({
      id: e.id,
      name: e.name,
      date: e.created_at,
      config: e.config,
      report: e.report
    }));
  } else {
    return getMaterialEstimatesLocal();
  }
};

const getMaterialEstimatesLocal = (): any[] => {
  const stored = localStorage.getItem(ESTIMATES_KEY);
  return stored ? JSON.parse(stored) : [];
};
