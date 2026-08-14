# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users span three situations evenly; no single dominant persona has been confirmed:

- Trip planners collecting places into a curated itinerary before or during travel.
- Local explorers discovering nearby places in the moment.
- Group trip coordinators planning collaboratively with friends and groups.

## Product Purpose

Venture lets people save, organize, rate, and revisit places and activities around the world. They search real places, keep a lasting personal collection with ratings and notes, group saved places into ordered "adventures," and share those collections with friends and groups. Success means the saved library keeps value over time — something users return to, not a one-off search.

## Positioning

Venture is a personal travel library: a lasting, personal collection of places with ratings and notes built on real place data, as an ecosystem-independent alternative to locked-in tools like Google Maps (per the original product spec).

## Operating Context

Mobile-first web app (React + Vite, Tailwind CSS, shadcn/ui). Users authenticate with Supabase (email/password). They search real places via the Foursquare Places API (proxied through Netlify Functions) and browse an interactive map (MapLibre GL + Protomaps vector tiles, OSRM routing with a straight-polyline fallback). A saved place carries real data — name, address, category, photos, hours, rating, website — plus the user's own rating and notes. Saved places can be grouped into adventures with ordering, cover photos, visibility control, public share links, and per-share edit permission. Social features (friends, groups, notifications) support sharing and collaboration.

## Capabilities and Constraints

Confirmed capabilities:

- Foursquare place search, autocomplete, and details.
- Interactive map with clustered pins and optional routing.
- Saving places with personal rating and notes.
- Adventures: ordered collections, drag-and-drop reorder, cover photo upload, copy, private/shared/public visibility, obfuscated public link tokens, and collaboration (`can_edit`) per share.
- Sharing adventures with friends and groups.
- Friends (request, accept, decline), groups (admin/member), and notifications.
- Profiles with display name, avatar, bio, and a public/private toggle.

Confirmed constraints:

- Mobile-first is binding; desktop is an adaptation of the mobile experience.
- Pre-launch: no real user base, testimonials, or production metrics exist.
- The Home page stats (10k+ places, 120+ countries, 4.9★) are placeholder marketing claims, not real evidence; future work must not present them as fact.
- Places come from real Foursquare data; place facts must never be invented.

Explicitly undecided:

- Offline support was deferred as an open question in the original spec and has not been confirmed in or out.

## Brand Commitments

- Product name: **Venture** (renamed from the working titles "Wanderlust Companion" and "Miniventure" during development).
- Incumbent voice on Home is travel-companion copy ("Your travel companion," "Discover places worth venturing to"); not yet confirmed as binding.

## Evidence on Hand

- Original product spec: `artifacts/draft_specifications.md`.
- Task plans and handoff notes: `artifacts/` (tasks 1–8, implementation plan, findings).
- Real place data comes from the Foursquare Places API.
- Absence: no real users, testimonials, case studies, or production metrics exist. Future work must not fabricate them.

## Product Principles

1. **A lasting personal travel library** — the saved collection and the ability to revisit it outrank one-off discovery; the library is the core asset.
2. **Real data over invented content** — places come from the Foursquare API, and user evidence is never fabricated.
3. **Mobile-first by default** — the phone experience is the product; larger screens adapt it.
4. **Sharing under user control** — private/shared/public visibility and per-share edit permission let users choose how open each collection is, from personal to collaborative.
5. **Discovery, planning, and coordination served evenly** — features serve trip planners, in-the-moment explorers, and group coordinators alike rather than optimizing one persona over the others.
