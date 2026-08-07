import React, { useState } from 'react';
import { supabase } from './lib/supabase/client';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      alert('Login failed: ' + error.message);
      return;
    }
    navigate('/');
  };

  return (
    <div className="container">
      <form onSubmit={onSubmit} className="max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-4">Login</h2>
        <label className="block mb-2">Email<input className="w-full p-2 border rounded" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="block mb-4">Password<input type="password" className="w-full p-2 border rounded" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        <p className="mt-4">Don\'t have an account? <Link to="/signup" className="text-indigo-600">Sign up</Link></p>
      </form>
    </div>
  );
}
