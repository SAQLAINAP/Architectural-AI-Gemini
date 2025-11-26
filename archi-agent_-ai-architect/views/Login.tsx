import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { NeoButton, NeoCard, NeoInput } from '../components/NeoComponents';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin,
            },
        });

        if (error) {
            setMessage(error.message);
        } else {
            setMessage('Check your email for the login link!');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-neo-bg flex items-center justify-center p-4">
            <NeoCard className="w-full max-w-md bg-white">
                <h1 className="text-3xl font-black mb-6 text-center">LOGIN</h1>
                <form onSubmit={handleLogin} className="space-y-4">
                    <NeoInput
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                    />
                    <NeoButton
                        className="w-full bg-black text-white hover:bg-gray-800"
                        disabled={loading}
                    >
                        {loading ? 'Sending Magic Link...' : 'Send Magic Link'}
                    </NeoButton>
                    {message && (
                        <div className="p-3 bg-blue-100 border-2 border-black text-sm font-bold">
                            {message}
                        </div>
                    )}
                </form>
                <div className="mt-4 text-center">
                    <button onClick={() => navigate('/')} className="text-sm underline">Continue as Guest</button>
                </div>
            </NeoCard>
        </div>
    );
};

export default Login;
