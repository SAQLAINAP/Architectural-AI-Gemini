import React, { useEffect, useState } from 'react';
import { SavedProject } from '../types';
import { getProjects, deleteProject } from '../services/storageService';
import { NeoButton, NeoCard } from '../components/NeoComponents';
import { Edit2, Trash2, Share2, LayoutTemplate, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProjectsProps {
  onLoadProject: (project: SavedProject) => void;
}

const Projects: React.FC<ProjectsProps> = ({ onLoadProject }) => {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setProjects(getProjects()); // Assuming getProjects() is the correct function, as getSavedProjects() was not defined in the original context.
  }, []);

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      deleteProject(id);
      setProjects(getProjects());
    }
  };

  const handleShare = (project: SavedProject) => {
    const text = `Check out my floor plan for ${project.name}! Designed with ArchAI.`;
    navigator.clipboard.writeText(text).then(() => {
      alert("Project description copied to clipboard!");
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-black">MY PROJECTS</h1>
        <NeoButton onClick={() => navigate('/configure')}>
          + New Project
        </NeoButton>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-white border-2 border-black shadow-neo">
          <LayoutTemplate size={64} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-2xl font-bold mb-2">No Projects Found</h2>
          <p className="mb-6">You haven't saved any designs yet.</p>
          <NeoButton onClick={() => navigate('/configure')}>Start Your First Project</NeoButton>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <NeoCard key={project.id} className="flex flex-col h-full hover:-translate-y-1 transition-transform">
              <div className="bg-gray-100 h-40 border-2 border-black mb-4 flex items-center justify-center overflow-hidden">
                {project.plan.imageUrl ? (
                  <img src={project.plan.imageUrl} alt="Project" className="w-full h-full object-cover" />
                ) : (
                  <LayoutTemplate size={48} className="text-gray-400" />
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-black mb-1 truncate">{project.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Calendar size={14} />
                  {new Date(project.date).toLocaleDateString()}
                </div>

                <div className="space-y-1 text-sm mb-4">
                  <p><span className="font-bold">Type:</span> {project.config?.projectType || 'N/A'}</p>
                  <p><span className="font-bold">Area:</span> {project.plan.totalArea || 0} m²</p>
                  <p><span className="font-bold">Cost:</span> ${project.plan.totalCostRange?.min.toLocaleString() || 0} - ${project.plan.totalCostRange?.max.toLocaleString() || 0}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-auto pt-4 border-t-2 border-black border-dashed">
                <button
                  onClick={() => onLoadProject(project)}
                  className="flex-1 flex items-center justify-center gap-1 bg-neo-primary border-2 border-black py-2 font-bold hover:bg-purple-400 text-sm"
                  title="Edit / View"
                >
                  <Edit2 size={16} /> Edit
                </button>
                <button
                  onClick={() => handleShare(project)}
                  className="flex items-center justify-center p-2 bg-neo-secondary border-2 border-black hover:bg-pink-300"
                  title="Share"
                >
                  <Share2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="flex items-center justify-center p-2 bg-red-400 border-2 border-black hover:bg-red-300"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </NeoCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
