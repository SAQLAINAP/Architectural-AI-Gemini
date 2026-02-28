import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NeoCard, NeoButton, NeoInput } from '../components/NeoComponents';
import { supabase } from '../lib/supabaseClient';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!supabase) {
      setError('Auth not configured');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      alert('Password updated successfully!');
      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <NeoCard className="max-w-md w-full">
        <h1 className="text-2xl font-black mb-4">RESET PASSWORD</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 font-bold text-sm">{error}</p>}
          <NeoInput
            label="New Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <NeoInput
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
          <NeoButton onClick={() => {}} disabled={loading} className="w-full">
            {loading ? 'Updating...' : 'Update Password'}
          </NeoButton>
        </form>
      </NeoCard>
    </div>
  );
};

export default ResetPassword;
