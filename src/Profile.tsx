import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase/client';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        setLoading(false);
        return;
      }
      const user = data.user;
      const md = (user.user_metadata || {}) as Record<string, any>;
      if (!mounted) return;
      setName(md.full_name || '');
      setBio(md.bio || '');
      setIsPublic(md.profile_public !== false);
      setAvatar(md.avatar_url || null);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: name,
        bio,
        profile_public: isPublic,
      }
    });
    setLoading(false);
    if (error) {
      alert('Failed to update profile: ' + error.message);
      return;
    }
    alert('Profile updated');
  };

  const uploadAvatar = async (file: File | null) => {
    if (!file) return;
    setLoading(true);
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
        const { error: updErr } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
        if (updErr) throw updErr;
        setAvatar(publicUrl);
      }
      alert('Avatar uploaded');
    } catch (err: any) {
      alert('Avatar upload failed: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    await uploadAvatar(f);
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-semibold mb-4">Your profile</h2>

      {avatar ? (
        <div className="mb-4">
          <img src={avatar} alt="avatar" className="w-24 h-24 rounded-full object-cover" />
        </div>
      ) : (
        <div className="mb-4 w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">No avatar</div>
      )}

      <form onSubmit={onSubmit}>
        <label className="block mb-2">Display name
          <input className="w-full p-2 border rounded" value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label className="block mb-2">Bio
          <textarea className="w-full p-2 border rounded" value={bio} onChange={e => setBio(e.target.value)} />
        </label>
        <label className="block mb-4">Public profile
          <input type="checkbox" className="ml-2" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
        </label>

        <div className="mb-4">
          <label className="block mb-2">Upload avatar</label>
          <input type="file" accept="image/*" onChange={onFileChange} />
        </div>

        <button className="px-4 py-2 bg-indigo-600 text-white rounded" disabled={loading}>{loading ? 'Saving...' : 'Save profile'}</button>
      </form>
    </div>
  );
}
