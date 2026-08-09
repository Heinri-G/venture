# App Specification: Miniventure (Working Title)

## 1. Overview
A web application that allows users to save, organize, and rate places and activities around the world. Users can group saved items into curated "adventures", share them, and connect with friends or groups, providing an alternative to ecosystem-locked tools like Google Maps.

## 2. Core Features

### 2.1. User Management & Authentication
* **Registration & Login**: Email/password and social login (e.g., Google, Apple) via Supabase Auth.
* **User Profiles**: Display name, avatar, bio, and a public/private toggle for the profile.

### 2.2. Places & Activities Management
* **Add a Location/Activity**: Users can search for a location (via a Maps API) or drop a pin/enter manual details.
* **Details & Metadata**: 
  * Name, Category (Restaurant, Hike, Museum, etc.)
  * Personal Notes
  * Rating (e.g., 1-5 stars)
  * Photos (optional, user-uploaded)
* **List/Map View**: Users can view their saved items in a list or plotted on an interactive map.

### 2.3. "Adventures" (Collections)
* **Grouping**: Combine multiple saved places/activities into an "Adventure" (e.g., "Kyoto 2026 Trip", "Best Coffee Shops in Berlin").
* **Ordering/Routing**: Optionally order the items chronologically or geographically.
* **Visibility**: Set an Adventure as Private, Shared with Friends/Groups, or Public.
* **Sharing**: Generate a shareable link for public or friend-restricted Adventures.

### 2.4. Social Features
* **Friends System**: Send, accept, and decline friend requests.
* **Groups**: Create groups (e.g., "Travel Buddies") to share places and adventures collaboratively.
* **Activity Feed (Optional)**: See recent public or friend-shared adventures and highly-rated places.

## 3. Proposed Tech Stack (Practical & Simple)
To keep development rapid, cost-effective, and scalable, a "Backend-as-a-Service" (BaaS) approach paired with a modern frontend framework is recommended.

* **Frontend**: **React + Vite** 
  * *Why*: Blazing-fast local development, simple production builds with Vite, and great DX for modern React apps.
* **Styling**: **Tailwind CSS**
  * *Why*: Industry standard for rapid, beautiful UI development.
* **Backend, Database, & Auth**: **Supabase**
  * *Why*: An open-source Firebase alternative powered by PostgreSQL. It handles user authentication, database storage (perfect for relational data like friends and groups), and file storage (for user avatars/photos) out of the box.
* **Maps Integration**: **Leaflet** (with OpenStreetMap)
  * *Why*: Leaflet is a robust, free, open-source alternative.
* **Serverless Functions / API**: **Netlify Functions**
  * *Why*: Securely proxy external APIs (e.g., Foursquare) and run server-side actions without exposing keys.
* **Hosting & Deployment**: **Netlify**
  * *Why*: Automatic deploys from GitHub main branch, first-class support for Netlify Functions, and free-tier hosting for MVP.

## 4. Open Questions & Clarifications
To help refine this specification before we begin implementation, please review the following questions:

1. **Map Interaction**: How central is the map to the experience? Should the app open directly to a map view (like Google Maps), or to a dashboard/feed of Adventures?
2. **Location Data Source**: When adding a place, should the app pull in existing data (address, photos, hours) from a service like the Foursquare Places API, or is it purely manual entry with a pin drop?
3. **Collaboration**: Can multiple users in a Group edit the same "Adventure" (e.g., planning a trip together), or is there always one single owner who shares it?
4. **Mobile vs. Desktop**: While this will be a web app, should we prioritize a mobile-first design (assuming users will use it on the go)?
5. **Offline Support**: Do you need the ability to view saved places and adventures while offline (e.g., travelling without cell service)? *(Note: This adds some technical complexity but is highly relevant for travel apps).* 
