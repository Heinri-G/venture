import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Camera, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from './lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Skeleton } from './components/ui/skeleton';
import { Switch } from './components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Textarea } from './components/ui/textarea';
import EdelweissMark from './components/brand/EdelweissMark';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        if (mounted) setLoading(false);
        return;
      }
      const user = userData.user;
      setEmail(user.email ?? '');
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, bio, is_public, avatar_url')
        .eq('id', user.id)
        .single();
      if (!mounted) return;
      if (error) {
        toast.error('Failed to load profile', { description: error.message });
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
    return () => {
      mounted = false;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      toast.error('Not authenticated');
      setSaving(false);
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
    setSaving(false);
    if (error) {
      toast.error('Failed to update profile', { description: error.message });
      return;
    }
    toast.success('Profile updated');
  };

  const uploadAvatar = async (file: File | null) => {
    if (!file) return;
    setSaving(true);
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
      toast.success('Avatar updated');
    } catch (err) {
      toast.error('Avatar upload failed', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    await uploadAvatar(f);
    e.target.value = '';
  };

  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  if (loading && !name && !bio && !avatar) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <h1 className="mb-6 font-heading text-3xl font-bold tracking-tight">Your Profile</h1>

      {/* Profile header card */}
      <Card className="mb-6 overflow-hidden py-0">
        <div className="relative h-28 overflow-hidden bg-meadow-hero sm:h-32">
          <EdelweissMark aria-hidden className="absolute -right-4 -top-6 size-32 text-primary/15" />
        </div>
        <CardContent className="flex flex-col items-start gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <Avatar className="-mt-10 size-24 ring-4 ring-background sm:-mt-12 sm:size-28">
            {avatar ? <AvatarImage src={avatar} alt="Profile avatar" /> : null}
            <AvatarFallback className="bg-primary/10 text-4xl text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col gap-2 sm:pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-xl font-semibold tracking-tight">{name || 'Explorer'}</h2>
              <Badge variant={isPublic ? 'default' : 'secondary'}>{isPublic ? 'Public' : 'Private'}</Badge>
            </div>
            {bio ? (
              <p className="max-w-md text-sm text-muted-foreground">{bio}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No bio yet — tell the world about yourself.</p>
            )}
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
          <label className="cursor-pointer">
            <input type="file" accept="image/*" onChange={onFileChange} className="hidden" disabled={saving} />
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <span className="pointer-events-none">
                <Camera />
                Change avatar
              </span>
            </Button>
          </label>
        </CardContent>
      </Card>

      <Tabs defaultValue="details">
        <TabsList variant="line" className="mb-6">
          <TabsTrigger value="details">Profile details</TabsTrigger>
          <TabsTrigger value="saved">Saved places</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <form onSubmit={onSubmit}>
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Profile details</CardTitle>
                <CardDescription>Update your public information</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Display name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your display name"
                    disabled={saving}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself"
                    rows={4}
                    disabled={saving}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium leading-none">Public profile</p>
                    <p className="mt-1 text-xs text-muted-foreground">Allow others to view your profile.</p>
                  </div>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} disabled={saving} />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" size="lg" className="h-11 w-full rounded-full" disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="saved">
          <Card className="items-center justify-center py-16 text-center shadow-sm">
            <CardContent className="flex flex-col items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bookmark className="size-5" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="font-heading text-base font-semibold">Your saved places live elsewhere</p>
                <p className="mx-auto max-w-xs text-sm text-muted-foreground">
                  Manage and browse your library on the Saved Places page — rate, note, and build adventures from there.
                </p>
              </div>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/saved-places">
                  <MapPin />
                  Go to saved places
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
