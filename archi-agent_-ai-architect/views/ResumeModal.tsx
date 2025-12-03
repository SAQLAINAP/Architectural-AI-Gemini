import React from 'react';
// Force git tracking update
import { NeoButton, NeoCard } from '../components/NeoComponents';
import { RefreshCw, X } from 'lucide-react';

interface ResumeModalProps {
    isOpen: boolean;
    onResume: () => void;
    onDiscard: () => void;
    lastSaved: string;
}

const ResumeModal: React.FC<ResumeModalProps> = ({ isOpen, onResume, onDiscard, lastSaved }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <NeoCard className="max-w-md w-full animate-in zoom-in-95">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-black flex items-center gap-2">
                        <RefreshCw className="text-neo-primary" /> Resume Session?
                    </h2>
                    <button onClick={onDiscard} className="p-1 hover:bg-gray-100 rounded">
                        <X size={20} />
                    </button>
                </div>

                <p className="mb-6 text-gray-600 dark:text-gray-300">
                    We found an unsaved project from <strong>{new Date(lastSaved).toLocaleString()}</strong>.
                    Would you like to continue where you left off?
                </p>

                <div className="flex gap-3 justify-end">
                    <NeoButton variant="secondary" onClick={onDiscard}>
                        Discard
                    </NeoButton>
                    <NeoButton onClick={onResume} className="bg-neo-primary text-black">
                        Resume Project
                    </NeoButton>
                </div>
            </NeoCard>
        </div>
    );
};

export default ResumeModal;
