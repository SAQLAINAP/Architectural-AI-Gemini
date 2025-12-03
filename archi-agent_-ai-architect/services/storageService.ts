
import { SavedProject, ProjectConfig, GeneratedPlan, SavedMaterialEstimate, MaterialEstimationConfig, MaterialReport } from '../types';
import { supabase } from '../lib/supabaseClient';

const STORAGE_KEY = 'archi_projects';
const ESTIMATES_KEY = 'archi_estimates';

// ==================== PROJECT FUNCTIONS ====================

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
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: project.name,
          data: {
            config: project.config,
            plan: project.plan
          }
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        date: data.created_at,
        config: data.data.config,
        plan: data.data.plan
      };
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      // Fallback to localStorage on error
      return saveProjectLocal(project);
    }
  } else {
    // Fallback to LocalStorage
    return saveProjectLocal(project);
  }
};

const saveProjectLocal = (project: Omit<SavedProject, 'id' | 'date'>): SavedProject => {
  const projects = getSavedProjectsLocal();
  const newProject: SavedProject = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    ...project
  };
  projects.push(newProject);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return newProject;
};

export const getSavedProjects = async (): Promise<SavedProject[]> => {
  try {
    if (!supabase) {
      return getSavedProjectsLocal();
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

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
  } catch (error) {
    console.error('Error fetching projects from Supabase:', error);
    return getSavedProjectsLocal();
  }
};

const getSavedProjectsLocal = (): SavedProject[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
};

export const deleteProject = async (id: string): Promise<void> => {
  try {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id); // Ensure user can only delete their own projects
        
        if (error) throw error;
      }
    }
  } catch (error) {
    console.error('Error deleting project from Supabase:', error);
  }

  // Also delete from local storage
  const projects = getSavedProjectsLocal().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

export const getProjectById = async (id: string): Promise<SavedProject | undefined> => {
  const projects = await getSavedProjects();
  return projects.find(p => p.id === id);
};

export const updateProject = async (id: string, updates: Partial<Omit<SavedProject, 'id' | 'date'>>): Promise<void> => {
  try {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('projects')
          .update({
            name: updates.name,
            data: {
              config: updates.config,
              plan: updates.plan
            }
          })
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (error) throw error;
        return;
      }
    }
  } catch (error) {
    console.error('Error updating project in Supabase:', error);
  }

  // Fallback to localStorage
  const projects = getSavedProjectsLocal();
  const index = projects.findIndex(p => p.id === id);
  if (index !== -1) {
    projects[index] = { ...projects[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }
};

// ==================== MATERIAL ESTIMATE FUNCTIONS ====================

export const saveMaterialEstimate = async (
  estimate: Omit<SavedMaterialEstimate, 'id' | 'date'>
): Promise<SavedMaterialEstimate> => {
  try {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('material_estimates')
          .insert({
            user_id: user.id,
            name: estimate.name,
            config: estimate.config,
            report: estimate.report
          })
          .select()
          .single();

        if (error) throw error;

        return {
          id: data.id,
          name: data.name,
          date: data.created_at,
          config: data.config,
          report: data.report
        };
      }
    }
  } catch (error) {
    console.error('Error saving estimate to Supabase:', error);
  }

  // Fallback to localStorage
  return saveMaterialEstimateLocal(estimate);
};

const saveMaterialEstimateLocal = (estimate: Omit<SavedMaterialEstimate, 'id' | 'date'>): SavedMaterialEstimate => {
  const estimates = getMaterialEstimatesLocal();
  const newEstimate: SavedMaterialEstimate = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    ...estimate
  };
  estimates.push(newEstimate);
  localStorage.setItem(ESTIMATES_KEY, JSON.stringify(estimates));
  return newEstimate;
};

export const getMaterialEstimates = async (): Promise<SavedMaterialEstimate[]> => {
  try {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('material_estimates')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((e: any) => ({
          id: e.id,
          name: e.name,
          date: e.created_at,
          config: e.config,
          report: e.report
        }));
      }
    }
  } catch (error) {
    console.error('Error fetching estimates from Supabase:', error);
  }

  return getMaterialEstimatesLocal();
};

const getMaterialEstimatesLocal = (): SavedMaterialEstimate[] => {
  try {
    const stored = localStorage.getItem(ESTIMATES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading estimates from localStorage:', error);
    return [];
  }
};

export const deleteMaterialEstimate = async (id: string): Promise<void> => {
  try {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('material_estimates')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (error) throw error;
      }
    }
  } catch (error) {
    console.error('Error deleting estimate from Supabase:', error);
  }

  // Also delete from localStorage
  const estimates = getMaterialEstimatesLocal().filter(e => e.id !== id);
  localStorage.setItem(ESTIMATES_KEY, JSON.stringify(estimates));
};

export const getMaterialEstimateById = async (id: string): Promise<SavedMaterialEstimate | undefined> => {
  const estimates = await getMaterialEstimates();
  return estimates.find(e => e.id === id);
};

// ==================== FLOOR PLAN FUNCTIONS ====================

export interface FloorPlanData {
  id: string;
  name: string;
  version: number;
  config: any;
  planData: any;
  sourceType: 'generated' | 'analyzed_image' | 'modified';
  parentPlanId?: string;
  sourceImageUrl?: string;
  generationModel?: string;
  generationParams?: any;
  status: 'draft' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

const FLOOR_PLANS_KEY = 'architectural_ai_floor_plans';

export const saveFloorPlan = async (
  floorPlan: Omit<FloorPlanData, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FloorPlanData> => {
  try {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('floor_plans')
          .insert({
            user_id: user.id,
            name: floorPlan.name,
            version: floorPlan.version,
            config: floorPlan.config,
            plan_data: floorPlan.planData,
            source_type: floorPlan.sourceType,
            parent_plan_id: floorPlan.parentPlanId,
            source_image_url: floorPlan.sourceImageUrl,
            generation_model: floorPlan.generationModel,
            generation_params: floorPlan.generationParams,
            status: floorPlan.status
          })
          .select()
          .single();

        if (error) throw error;

        return {
          id: data.id,
          name: data.name,
          version: data.version,
          config: data.config,
          planData: data.plan_data,
          sourceType: data.source_type,
          parentPlanId: data.parent_plan_id,
          sourceImageUrl: data.source_image_url,
          generationModel: data.generation_model,
          generationParams: data.generation_params,
          status: data.status,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      }
    }
  } catch (error) {
    console.error('Error saving floor plan to Supabase:', error);
  }

  // Fallback to localStorage
  return saveFloorPlanLocal(floorPlan);
};

const saveFloorPlanLocal = (floorPlan: Omit<FloorPlanData, 'id' | 'createdAt' | 'updatedAt'>): FloorPlanData => {
  const floorPlans = getFloorPlansLocal();
  const now = new Date().toISOString();
  const newFloorPlan: FloorPlanData = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...floorPlan
  };
  floorPlans.push(newFloorPlan);
  localStorage.setItem(FLOOR_PLANS_KEY, JSON.stringify(floorPlans));
  return newFloorPlan;
};

export const getFloorPlans = async (): Promise<FloorPlanData[]> => {
  try {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('floor_plans')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((fp: any) => ({
          id: fp.id,
          name: fp.name,
          version: fp.version,
          config: fp.config,
          planData: fp.plan_data,
          sourceType: fp.source_type,
          parentPlanId: fp.parent_plan_id,
          sourceImageUrl: fp.source_image_url,
          generationModel: fp.generation_model,
          generationParams: fp.generation_params,
          status: fp.status,
          createdAt: fp.created_at,
          updatedAt: fp.updated_at
        }));
      }
    }
  } catch (error) {
    console.error('Error fetching floor plans from Supabase:', error);
  }

  return getFloorPlansLocal();
};

const getFloorPlansLocal = (): FloorPlanData[] => {
  try {
    const stored = localStorage.getItem(FLOOR_PLANS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading floor plans from localStorage:', error);
    return [];
  }
};

export const getFloorPlanById = async (id: string): Promise<FloorPlanData | undefined> => {
  const floorPlans = await getFloorPlans();
  return floorPlans.find(fp => fp.id === id);
};

export const updateFloorPlan = async (id: string, updates: Partial<Omit<FloorPlanData, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const updateData: any = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.version !== undefined) updateData.version = updates.version;
        if (updates.config !== undefined) updateData.config = updates.config;
        if (updates.planData !== undefined) updateData.plan_data = updates.planData;
        if (updates.sourceType !== undefined) updateData.source_type = updates.sourceType;
        if (updates.parentPlanId !== undefined) updateData.parent_plan_id = updates.parentPlanId;
        if (updates.sourceImageUrl !== undefined) updateData.source_image_url = updates.sourceImageUrl;
        if (updates.generationModel !== undefined) updateData.generation_model = updates.generationModel;
        if (updates.generationParams !== undefined) updateData.generation_params = updates.generationParams;
        if (updates.status !== undefined) updateData.status = updates.status;

        const { error } = await supabase
          .from('floor_plans')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (error) throw error;
        return;
      }
    }
  } catch (error) {
    console.error('Error updating floor plan in Supabase:', error);
  }

  // Fallback to localStorage
  const floorPlans = getFloorPlansLocal();
  const index = floorPlans.findIndex(fp => fp.id === id);
  if (index !== -1) {
    floorPlans[index] = { 
      ...floorPlans[index], 
      ...updates,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(FLOOR_PLANS_KEY, JSON.stringify(floorPlans));
  }
};

export const deleteFloorPlan = async (id: string): Promise<void> => {
  try {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('floor_plans')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (error) throw error;
      }
    }
  } catch (error) {
    console.error('Error deleting floor plan from Supabase:', error);
  }

  // Also delete from localStorage
  const floorPlans = getFloorPlansLocal().filter(fp => fp.id !== id);
  localStorage.setItem(FLOOR_PLANS_KEY, JSON.stringify(floorPlans));
};

export const getFloorPlanVersions = async (parentPlanId: string): Promise<FloorPlanData[]> => {
  try {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('floor_plans')
          .select('*')
          .eq('user_id', user.id)
          .eq('parent_plan_id', parentPlanId)
          .order('version', { ascending: false });

        if (error) throw error;

        return data.map((fp: any) => ({
          id: fp.id,
          name: fp.name,
          version: fp.version,
          config: fp.config,
          planData: fp.plan_data,
          sourceType: fp.source_type,
          parentPlanId: fp.parent_plan_id,
          sourceImageUrl: fp.source_image_url,
          generationModel: fp.generation_model,
          generationParams: fp.generation_params,
          status: fp.status,
          createdAt: fp.created_at,
          updatedAt: fp.updated_at
        }));
      }
    }
  } catch (error) {
    console.error('Error fetching floor plan versions from Supabase:', error);
  }

  // Fallback to localStorage
  const floorPlans = getFloorPlansLocal();
  return floorPlans
    .filter(fp => fp.parentPlanId === parentPlanId)
    .sort((a, b) => b.version - a.version);
};

// ==================== STORAGE HELPERS ====================

const FLOOR_PLANS_BUCKET = 'floor-plans';

export const uploadFloorPlanImage = async (fileName: string, base64DataUrl: string): Promise<string | null> => {
  try {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Convert data URL to Blob
    const res = await fetch(base64DataUrl);
    const blob = await res.blob();
    const path = `${user.id}/${Date.now()}_${fileName}`;

    const { error } = await supabase.storage.from(FLOOR_PLANS_BUCKET).upload(path, blob, {
      contentType: blob.type,
      upsert: false
    });
    if (error) throw error;

    const { data } = supabase.storage.from(FLOOR_PLANS_BUCKET).getPublicUrl(path);
    return data.publicUrl || null;
  } catch (error) {
    console.error('Error uploading floor plan image to Storage:', error);
    return null;
  }
};
