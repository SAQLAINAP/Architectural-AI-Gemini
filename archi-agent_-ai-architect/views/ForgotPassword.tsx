import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { NeoCard, NeoButton, NeoInput } from '../components/NeoComponents';
import { supabase } from '../lib/supabaseClient';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Auth not configured');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <NeoCard className="max-w-md w-full">
        <h1 className="text-2xl font-black mb-4">FORGOT PASSWORD</h1>
        {sent ? (
          <div className="space-y-4">
            <p className="font-bold text-green-600">Password reset email sent! Check your inbox.</p>
            <Link to="/login" className="font-bold underline">Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-600 font-bold text-sm">{error}</p>}
            <NeoInput
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <NeoButton onClick={() => {}} disabled={loading} className="w-full">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </NeoButton>
            <Link to="/login" className="block text-center font-bold text-sm underline">
              Back to Login
            </Link>
          </form>
        )}
      </NeoCard>
    </div>
  );
};

export default ForgotPassword;
