import React, { useState, useRef, useEffect } from 'react';
import type { GeneratedPlan, ModificationAnalysis, ChatMessage } from '../types';
import { NeoButton, NeoCard } from './NeoComponents';
import { MessageSquare, Send, RefreshCw, Lightbulb, CheckCircle } from 'lucide-react';

interface ChatPanelProps {
  plan: GeneratedPlan;
  onAnalyzeModification?: (request: string) => Promise<ModificationAnalysis>;
  onApplyModification?: (request: string) => Promise<void>;
  isProcessing?: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ plan, onAnalyzeModification, onApplyModification, isProcessing }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !onAnalyzeModification) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsAnalyzing(true);

    try {
      const analysis = await onAnalyzeModification(userMsg.content);
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: analysis.analysis,
        timestamp: Date.now(),
        analysis,
        applied: false,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, analysis failed. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = async (msg: ChatMessage) => {
    if (!onApplyModification || !msg.analysis) return;
    await onApplyModification(msg.analysis.originalRequest);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, applied: true } : m));
  };

  return (
    <NeoCard className="border-t-4 border-neo-primary flex flex-col" style={{ maxHeight: '500px' }}>
      <h3 className="font-black text-lg mb-3 flex items-center gap-2 dark:text-white">
        <MessageSquare size={20} className="text-neo-primary" /> AI Modification Chat
      </h3>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-3 min-h-[120px] max-h-[320px]">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 italic text-center py-4">
            Ask to modify the plan, e.g. "Move the kitchen to the North side"
          </p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 text-sm ${
              msg.role === 'user'
                ? 'bg-neo-primary text-black border-2 border-black'
                : 'bg-gray-50 dark:bg-slate-700 border-2 border-black dark:border-gray-500'
            }`}>
              <p className="dark:text-white">{msg.content}</p>

              {/* Analysis Card */}
              {msg.analysis && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-bold border border-black ${
                      msg.analysis.feasibility === 'FEASIBLE' ? 'bg-green-200 text-green-900' :
                      msg.analysis.feasibility === 'CAUTION' ? 'bg-yellow-200 text-yellow-900' : 'bg-red-200 text-red-900'
                    }`}>
                      {msg.analysis.feasibility}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white dark:bg-slate-800 p-1.5 border border-gray-200 dark:border-gray-600">
                      <strong className="block text-neo-secondary">Vastu</strong>
                      <p className="dark:text-gray-300">{msg.analysis.vastuImplications}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-1.5 border border-gray-200 dark:border-gray-600">
                      <strong className="block text-neo-accent">Regulatory</strong>
                      <p className="dark:text-gray-300">{msg.analysis.regulatoryImplications}</p>
                    </div>
                  </div>

                  {msg.analysis.suggestion && (
                    <div className="flex items-start gap-1.5 text-xs bg-blue-50 dark:bg-blue-900/30 p-1.5">
                      <Lightbulb size={12} className="text-blue-600 shrink-0 mt-0.5" />
                      <p className="dark:text-blue-100">{msg.analysis.suggestion}</p>
                    </div>
                  )}

                  {msg.analysis.feasibility !== 'NOT_RECOMMENDED' && !msg.applied && (
                    <NeoButton
                      onClick={() => handleApply(msg)}
                      className="bg-green-500 hover:bg-green-600 text-white border-green-700 text-xs px-2 py-1"
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Applying...' : 'Apply Changes'}
                    </NeoButton>
                  )}

                  {msg.applied && (
                    <div className="flex items-center gap-1 text-xs text-green-600 font-bold">
                      <CheckCircle size={12} /> Applied
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isAnalyzing && (
          <div className="flex justify-start">
            <div className="bg-gray-50 dark:bg-slate-700 border-2 border-black dark:border-gray-500 p-3 text-sm">
              <RefreshCw size={16} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          className="flex-1 p-3 border-2 border-black dark:border-white bg-white dark:bg-slate-800 dark:text-white focus:outline-none text-sm"
          placeholder="Describe a change..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={isProcessing || isAnalyzing}
        />
        <NeoButton onClick={handleSend} disabled={!input.trim() || isProcessing || isAnalyzing}>
          {isAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
        </NeoButton>
      </div>
    </NeoCard>
  );
};

export default ChatPanel;
