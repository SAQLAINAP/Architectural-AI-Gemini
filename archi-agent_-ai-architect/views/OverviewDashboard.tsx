import React, { useState, useEffect } from 'react';
import { NeoCard } from '../components/NeoComponents';
import { useAuth } from '../contexts/AuthContext';
import { getSavedProjects, getFloorPlans, getMaterialEstimates } from '../services/storageService';
import { Folder, FileText, Coins, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const OverviewDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ projects: 0, floorPlans: 0, estimates: 0 });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [projects, floorPlans, estimates] = await Promise.all([
          getSavedProjects(),
          getFloorPlans(),
          getMaterialEstimates(),
        ]);
        setStats({
          projects: projects.length,
          floorPlans: floorPlans.length,
          estimates: estimates.length,
        });
      } catch {
        // Ignore errors
      }
    };
    loadStats();
  }, []);

  const cards = [
    { icon: Folder, label: 'Projects', count: stats.projects, path: '/projects', color: 'bg-purple-100' },
    { icon: FileText, label: 'Floor Plans', count: stats.floorPlans, path: '/projects', color: 'bg-blue-100' },
    { icon: Coins, label: 'Estimates', count: stats.estimates, path: '/materials', color: 'bg-green-100' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">DASHBOARD</h1>
        <p className="text-gray-600 dark:text-gray-400 font-medium">
          Welcome{user?.email ? `, ${user.email}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {cards.map(({ icon: Icon, label, count, path, color }) => (
          <NeoCard
            key={label}
            className={`${color} dark:bg-slate-700 cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform`}
          >
            <div onClick={() => navigate(path)}>
              <div className="flex items-center gap-3 mb-3">
                <Icon size={24} />
                <span className="font-bold text-lg">{label}</span>
              </div>
              <div className="text-4xl font-black">{count}</div>
            </div>
          </NeoCard>
        ))}
      </div>

      <NeoCard>
        <div className="flex items-center gap-3 mb-4">
          <Activity size={24} />
          <h2 className="text-xl font-black">QUICK ACTIONS</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/configure')}
            className="p-4 border-2 border-black dark:border-white font-bold hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors text-left"
          >
            + New Floor Plan
          </button>
          <button
            onClick={() => navigate('/materials')}
            className="p-4 border-2 border-black dark:border-white font-bold hover:bg-green-100 dark:hover:bg-green-900 transition-colors text-left"
          >
            + New Cost Estimate
          </button>
        </div>
      </NeoCard>
    </div>
  );
};

export default OverviewDashboard;
