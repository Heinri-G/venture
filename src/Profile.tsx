import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase/client';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setSaveError('');
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setLoading(false);
        return;
      }
      const user = userData.user;
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, bio, is_public, avatar_url')
        .eq('id', user.id)
        .single();
      if (!mounted) return;
      if (error) {
        setSaveError('Failed to load profile');
        setLoading(false);
        return;
      }
      setName(data?.display_name || '');
      setBio(data?.bio || '');
      setIsPublic(data?.is_public !== false);
      setAvatar(data?.avatar_url || null);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveError('');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setSaveError('Not authenticated');
      setLoading(false);
      return;
    }
    const user = userData.user;
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: name || null,
        bio: bio || null,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    setLoading(false);
    if (error) {
      setSaveError('Failed to update profile: ' + error.message);
      return;
    }
    setSaveError('');
  };

  const uploadAvatar = async (file: File | null) => {
    if (!file) return;
    setLoading(true);
    setSaveError('');
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) throw new Error('Not authenticated');
      const user = userData.user;
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = publicData?.publicUrl || null;
      if (publicUrl) {
        const { error: updErr } = await supabase
          .from('profiles')
          .update({
            avatar_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
        if (updErr) throw updErr;
        setAvatar(publicUrl);
      }
      setSaveError('');
    } catch (err: any) {
      setSaveError('Avatar upload failed: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    await uploadAvatar(f);
  };

  if (loading && !name && !bio && !avatar) return <div className="p-4 text-center">Loading profile...</div>;

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-semibold">Your Profile</h2>

      {saveError && (
        <div className="p-3 bg-red-100 text-red-800 rounded text-sm">
          {saveError}
        </div>
      )}

      <div className="flex flex-col items-center space-y-3">
        {avatar ? (
          <img src={avatar} alt="avatar" className="w-24 h-24 rounded-full object-cover" />
        ) : (
          <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center text-gray-600">No avatar</div>
        )}
        <label className="text-sm text-gray-600">
          <input type="file" accept="image/*" onChange={onFileChange} className="hidden" disabled={loading} />
          <span className="cursor-pointer text-indigo-600 hover:text-indigo-700">Change avatar</span>
        </label>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">Display name</label>
          <input
            id="name"
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:ring-2"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your display name"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-1">Bio</label>
          <textarea
            id="bio"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:ring-2"
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell us about yourself"
            rows={4}
            disabled={loading}
          />
        </div>

        <div className="flex items-center space-x-3">
          <input
            id="public"
            type="checkbox"
            className="w-4 h-4"
            checked={isPublic}
            onChange={e => setIsPublic(e.target.checked)}
            disabled={loading}
          />
          <label htmlFor="public" className="text-sm font-medium cursor-pointer">
            Make profile public
          </label>
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
