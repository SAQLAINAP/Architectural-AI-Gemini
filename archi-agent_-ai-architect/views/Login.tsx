import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { NeoButton, NeoCard, NeoInput } from '../components/NeoComponents';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type AuthMode = 'password' | 'signup';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' }>({ text: '', type: 'success' });
    const [authMode, setAuthMode] = useState<AuthMode>('password');
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const redirectTo = searchParams.get('redirectTo') || '/overview';
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && user) {
            navigate(redirectTo, { replace: true });
        }
    }, [user, authLoading, redirectTo, navigate]);

    const handlePasswordAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            setMessage({ text: 'Supabase is not configured. Please check your environment variables.', type: 'error' });
            return;
        }
        
        setLoading(true);
        setMessage({ text: '', type: 'success' });

        if (authMode === 'signup') {
            // Sign up new user
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/login?redirectTo=${encodeURIComponent(redirectTo)}`,
                },
            });

            if (error) {
                setMessage({ text: error.message, type: 'error' });
            } else {
                setMessage({ text: 'Account created! Check your email to verify your account to complete signup.', type: 'success' });
            }
        } else {
            // Sign in existing user
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setMessage({ text: error.message, type: 'error' });
            } else {
                setMessage({ text: 'Login successful! Redirecting...', type: 'success' });
                setTimeout(() => navigate(redirectTo), 800);
            }
        }
        setLoading(false);
    };

    const handleSubmit = handlePasswordAuth;

    return (
        <div className="min-h-screen bg-neo-bg flex items-center justify-center p-4">
            <NeoCard className="w-full max-w-md bg-white">
                <h1 className="text-3xl font-black mb-2 text-center">
                    {authMode === 'signup' ? 'SIGN UP' : 'LOGIN'}
                </h1>
                <p className="text-sm text-gray-600 text-center mb-6">
                    {authMode === 'password' && 'Sign in with your email and password'}
                    {authMode === 'signup' && 'Create an account; we will email you to verify'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <NeoInput
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                    />
                    
                    <NeoInput
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                    />
                    
                    <NeoButton
                        className="w-full bg-black text-white hover:bg-gray-800"
                        disabled={loading}
                    >
                        {loading ? (
                            authMode === 'signup' ? 'Creating Account...' : 'Signing In...'
                        ) : (
                            authMode === 'signup' ? 'Sign Up' : 'Sign In'
                        )}
                    </NeoButton>

                    {message.text && (
                        <div className={`p-3 border-2 border-black text-sm font-bold flex items-start gap-2 ${
                            message.type === 'error' ? 'bg-red-100' : 'bg-green-100'
                        }`}>
                            {message.type === 'error' ? (
                                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                            ) : (
                                <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
                            )}
                            <span>{message.text}</span>
                        </div>
                    )}
                </form>

                {authMode === 'password' && (
                    <div className="mt-4 space-y-2">
                        <div className="text-center">
                            <button 
                                onClick={() => setAuthMode('signup')} 
                                className="text-sm font-bold underline hover:text-gray-600 dark:text-gray-300 dark:hover:text-white"
                            >
                                Don't have an account? Sign up
                            </button>
                        </div>
                        <div className="text-center">
                            <button 
                                onClick={() => navigate(`/forgot-password?redirectTo=${encodeURIComponent(redirectTo)}`)} 
                                className="text-sm font-bold underline hover:text-gray-600 dark:text-gray-300 dark:hover:text-white"
                            >
                                Forgot your password?
                            </button>
                        </div>
                    </div>
                )}

                {authMode === 'signup' && (
                    <div className="mt-4 space-y-2">
                        <div className="text-center">
                            <button 
                                onClick={() => setAuthMode('password')} 
                                className="text-sm font-bold underline hover:text-gray-600 dark:text-gray-300 dark:hover:text-white"
                            >
                                Already have an account? Sign in
                            </button>
                        </div>
                        <div className="text-center pt-2 border-t-2 border-dashed border-gray-300 dark:border-gray-600">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Didn't receive verification email? Check spam or contact support
                            </p>
                        </div>
                    </div>
                )}

                <div className="mt-4 text-center pt-4 border-t-2 border-black border-dashed">
                    <button 
                        onClick={() => navigate('/')} 
                        className="text-sm underline hover:text-gray-600"
                    >
                        Continue as Guest
                    </button>
                </div>
            </NeoCard>
        </div>
    );
};

export default Login;
