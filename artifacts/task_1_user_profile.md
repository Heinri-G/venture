# Task 1: Basic User Profile Page

## Context
A key aspect of personalization is allowing users to maintain a profile. On user signup, a record is automatically created in the `public.profiles` table via database trigger. This task implements a dedicated `/profile` page where logged-in users can view and edit their profile details (display name, bio, profile image/avatar, and public privacy toggle).

---

## Requirements

### 1. Route Configuration
* Ensure the path `/profile` points to a page/component rendering the user's profile settings.
* This route must be protected: if an unauthenticated user tries to access `/profile`, they should be redirected back to `/login`.

### 2. UI Components (Mobile-First)
* **Avatar Upload**: A circular image component showing the user's avatar. Allow uploading a new image to Supabase Storage (under a public bucket like `avatars`), returning the URL to save to the profile.
* **Form Fields**:
  * **Display Name**: Text input to set display name.
  * **Bio**: Textarea for a brief biography.
  * **Privacy Toggle (is_public)**: Switch or toggle mapping to the `is_public` boolean in the DB.
* **Save Action**: A visible "Save Changes" button with loading/saving states.
* **Navigation/Layout**: Must be wrapped inside the app's standard layout with access to home/back buttons.

### 3. Database / Backend Binding
* **Fetch**: On page mount, query the `public.profiles` table for the matching logged-in user `id`.
* **Update**: Upsert or update the profile row in `public.profiles` upon submission.
* **Storage Bucket**: If not already present, instructions should guide creating a Supabase Storage bucket named `avatars` with public read access.

---

## Target Files
* `src/Profile.tsx` (or `src/pages/Profile.tsx` if routing is updated)
* `src/App.tsx` (to configure routing to Profile)
* `src/lib/supabase/client.ts` (used to query profiles and upload avatar images)

---

## Verification Checklist

- [ ] Route `/profile` loads successfully when logged in and redirects to `/login` when logged out.
- [ ] Profile values (Display Name, Bio, Privacy) are fetched and rendered properly on mount.
- [ ] Editing fields and clicking "Save" updates the row correctly in Supabase `profiles` table.
- [ ] Uploading a new profile picture successfully saves the file to Supabase Storage and updates `avatar_url` in the database.
- [ ] No raw errors or crashes occur when saving with empty bio or display name.
