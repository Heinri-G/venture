import React, { useState } from 'react';
import { supabase } from './lib/supabase/client';
import { useNavigate, Link } from 'react-router-dom';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    setLoading(false);
    if (error) {
      alert('Signup failed: ' + error.message);
      return;
    }
    navigate('/');
  };

  return (
    <div className="container">
      <form onSubmit={onSubmit} className="max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-4">Create account</h2>
        <label className="block mb-2">Full name<input className="w-full p-2 border rounded" value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="block mb-2">Email<input className="w-full p-2 border rounded" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="block mb-4">Password<input type="password" className="w-full p-2 border rounded" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button className="px-4 py-2 bg-emerald-600 text-white rounded" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
        <p className="mt-4">Already have an account? <Link to="/login" className="text-indigo-600">Sign in</Link></p>
      </form>
    </div>
  );
}
