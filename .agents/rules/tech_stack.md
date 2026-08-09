# Tech Stack Rules: Wanderlust

1. **Framework**: Use React + Vite. Build as a Progressive Web App (PWA) if desired (use Vite PWA plugin).
2. **Backend**: Use Supabase for all database, authentication, and storage needs. Do not use custom backend routes unless necessary for proxying API keys (like Foursquare).
3. **Maps**: Use Leaflet + OpenStreetMap (`leaflet`, `react-leaflet`, `react-leaflet-cluster`) for rendering maps. No API token is required.
4. **Places Data**: Use Foursquare Places API for searching places and retrieving place details/photos.
5. **Styling**: Use Tailwind CSS for all styling.
