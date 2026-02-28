
import React, { useState } from 'react';
import { Menu, X, Home, FilePlus, Upload, ShieldCheck, Folder, BookOpen, Sun, Moon, Coins, User, LogOut, LogIn, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const NeoCard: React.FC<{ children?: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white dark:bg-slate-800 dark:border-white border-2 border-black shadow-neo dark:shadow-neoDark p-6 ${className}`}>
    {children}
  </div>
);

export const NeoButton = ({ onClick, children, variant = 'primary', className = "", disabled = false, title }: { onClick?: () => void, children?: React.ReactNode, variant?: 'primary' | 'secondary' | 'accent' | 'danger', className?: string, disabled?: boolean, title?: string }) => {
  const colors = {
    primary: 'bg-neo-primary hover:bg-purple-400 dark:text-black',
    secondary: 'bg-neo-secondary hover:bg-pink-300 dark:text-black',
    accent: 'bg-neo-accent hover:bg-teal-300 dark:text-black',
    danger: 'bg-red-400 hover:bg-red-300 dark:text-black'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        ${colors[variant]} 
        text-black font-bold border-2 border-black dark:border-white shadow-neo dark:shadow-neoDark
        active:shadow-none active:translate-x-[4px] active:translate-y-[4px] 
        transition-all px-6 py-3 flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export const NeoInput = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <div className="flex flex-col gap-1">
    <label className="font-bold text-sm dark:text-slate-200">{label}</label>
    <input
      className="bg-white dark:bg-slate-700 dark:text-white border-2 border-black dark:border-white p-3 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
      {...props}
    />
  </div>
);

export const NeoSelect = ({ label, options, placeholder, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string, options: string[], placeholder?: string }) => (
  <div className="flex flex-col gap-1">
    <label className="font-bold text-sm dark:text-slate-200">{label}</label>
    <select
      className="bg-white dark:bg-slate-700 dark:text-white border-2 border-black dark:border-white p-3 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
      {...props}
    >
      {(!props.value || props.value === '') && (
        <option value="" disabled>{placeholder || `Select ${label}...`}</option>
      )}
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

export const Navbar = ({ isDark, toggleTheme }: { isDark: boolean, toggleTheme: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleAuthAction = async () => {
    if (user) {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (!confirmed) return;
      await signOut();
      navigate('/login');
    } else {
      navigate('/login');
    }
    setIsOpen(false);
  };

  const NavItem = ({ icon: Icon, label, target }: { icon: any, label: string, target: string }) => (
    <button
      onClick={() => { navigate(target); setIsOpen(false); }}
      className="flex items-center gap-2 font-bold text-black dark:text-white hover:bg-neo-primary hover:text-black px-4 py-2 h-10 border-2 border-transparent hover:border-black dark:hover:border-white transition-all w-full md:w-auto rounded-none leading-none"
    >
      <Icon size={20} /> {label}
    </button>
  );

  return (
    <nav className="bg-white dark:bg-slate-800 border-b-4 border-black dark:border-white sticky top-0 z-50 transition-colors">
      <div className="max-w-[90%] mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-black text-xl shadow-[4px_4px_0px_0px_#a388ee]">
            Ai
          </div>
          <span className="text-2xl font-black tracking-tighter dark:text-white">ArchAI</span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-4">
          <NavItem icon={Home} label="Home" target="/" />
          <NavItem icon={LayoutDashboard} label="Dashboard" target="/overview" />
          <NavItem icon={FilePlus} label="New Project" target="/configure" />
          <NavItem icon={Coins} label="Materials" target="/materials" />
          <NavItem icon={Folder} label="My Projects" target="/projects" />
          <NavItem icon={BookOpen} label="Docs" target="/docs" />

          {/* Auth Button */}
          <button
            onClick={handleAuthAction}
            className="flex items-center gap-2 font-bold bg-neo-accent hover:bg-teal-300 text-black px-4 py-0 h-10 border-2 border-black transition-all leading-none"
            title={user ? 'Logout' : 'Login'}
          >
            {user ? (
              <>
                <LogOut size={20} />
                <span className="hidden lg:inline">Logout</span>
              </>
            ) : (
              <>
                <LogIn size={20} />
                <span className="hidden lg:inline">Login</span>
              </>
            )}
          </button>

          <button
            onClick={toggleTheme}
            className="ml-2 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-black dark:text-yellow-300"
            title="Toggle Theme"
          >
            {isDark ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 text-black dark:text-yellow-300"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="p-2 border-2 border-black dark:border-white dark:text-white" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t-2 border-black dark:border-white bg-white dark:bg-slate-800 p-4 flex flex-col gap-2">
          <NavItem icon={Home} label="Home" target="/" />
          <NavItem icon={LayoutDashboard} label="Dashboard" target="/overview" />
          <NavItem icon={FilePlus} label="New Project" target="/configure" />
          <NavItem icon={Coins} label="Materials" target="/materials" />
          <NavItem icon={Folder} label="My Projects" target="/projects" />
          <NavItem icon={BookOpen} label="Docs" target="/docs" />
          
          {/* Mobile Auth Button */}
          <button
            onClick={handleAuthAction}
            className="flex items-center gap-2 font-bold bg-neo-accent hover:bg-teal-300 text-black px-4 py-2 border-2 border-black transition-all w-full"
          >
            {user ? (
              <>
                <LogOut size={20} />
                Logout
              </>
            ) : (
              <>
                <LogIn size={20} />
                Login
              </>
            )}
          </button>
        </div>
      )}
    </nav>
  );
};