# 🌍 Travi — App Progress Tracker

> A social travel app for planning trips, logging experiences, discovering destinations, and booking reservations.

---

## 📌 App Overview

**Name:** Travi
**Tagline:** *Your journey, shared.*
**Category:** Travel / Social
**Inspired by:** Polarsteps, Been, Journo, Swarm
**Status:** 🟡 In Development

---

## 💼 Business Plan

### The Problem
Travelers currently use a fragmented mix of tools — Google Maps for discovery, Instagram for sharing, Google Calendar for planning, TripAdvisor for reviews, and Booking.com for reservations. There's no single app that ties the full travel lifecycle together with a social layer.

### The Solution
Travi is a social travel platform where users:
- Plan trips and build itineraries
- Log real-time location check-ins and reviews
- Discover destinations via other travelers' public "Traviis" (trip journals)
- Book restaurants, hotels, and experiences directly
- Share their journeys across social media

### Target Audience
- Frequent travelers (25–45, digitally active)
- Travel bloggers and content creators
- Group trip planners
- Backpackers and solo travelers

### Competitive Advantage
| Feature | Travi | Polarsteps | Been | Journo | Swarm |
|---|---|---|---|---|---|
| Trip planning | ✅ | ✅ | ❌ | ✅ | ❌ |
| Social discovery | ✅ | ⚠️ | ❌ | ❌ | ✅ |
| In-app booking | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reviews & comments | ✅ | ⚠️ | ❌ | ✅ | ✅ |
| Calendar integration | ✅ | ❌ | ❌ | ❌ | ❌ |
| Social media sharing | ✅ | ✅ | ✅ | ✅ | ✅ |

### Monetization Strategy
- **Phase 1 (Launch):** Free — grow user base and content
- **Phase 2:** One-time flat rate purchase on App Store / Google Play (~$2.99–$4.99)
- **Phase 3:** Booking commission fees (5–10% on reservations made through Travi)
- **Future:** Travi Pro (premium features: advanced analytics, export, custom branding for creators)

### Revenue Projections (Conservative)
| Year | Users | Revenue Model | Est. Revenue |
|---|---|---|---|
| Year 1 | 10,000 | Free | $0 (growth phase) |
| Year 2 | 50,000 | App purchase ($3.99) + bookings | ~$120K |
| Year 3 | 200,000 | Purchase + bookings + Pro | ~$600K |

---

## 🏗️ Tech Stack

### Web App
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Maps:** Mapbox GL JS (or Google Maps API)
- **Auth:** NextAuth.js / Clerk
- **Database:** PostgreSQL via Supabase
- **ORM:** Prisma
- **Storage:** Supabase Storage (images, media)
- **Deployment:** Vercel

### Mobile App
- **Framework:** React Native (Expo)
- **Navigation:** Expo Router
- **Shared logic:** API from Next.js backend

---

## 🗺️ Feature Roadmap

### MVP (Phase 1) — Now Building
- [ ] User auth (sign up / login)
- [ ] Create a Travi (trip)
- [ ] Add locations/stops to a Travi
- [ ] View map of your Travi
- [ ] Add reviews and comments to locations
- [ ] Public/private Travi toggle
- [ ] Browse/discover other Traviis
- [ ] Social media share card generation

### Phase 2
- [ ] Calendar integration (Google Calendar)
- [ ] In-app booking (restaurants via OpenTable API, hotels via Booking.com API)
- [ ] Follow other travelers
- [ ] Like and save Traviis
- [ ] Notifications

### Phase 3
- [ ] Mobile app (React Native / Expo)
- [ ] Offline mode
- [ ] Travel stats dashboard (countries visited, miles traveled, etc.)
- [ ] Travi Pro subscription

---

## 📁 Project Structure

```
travi/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login / signup pages
│   ├── (dashboard)/        # Authenticated app pages
│   │   ├── explore/        # Discover Traviis
│   │   ├── my-traviis/     # User's own trips
│   │   └── travi/[id]/     # Individual Travi view
│   ├── api/                # API routes
│   └── layout.tsx
├── components/             # Reusable UI components
├── lib/                    # Utilities, DB client, auth
├── prisma/                 # Database schema
└── public/                 # Static assets
```

---

## 🏃 Build Log

### March 11, 2026
- ✅ App concept defined
- ✅ Business plan written
- ✅ Tech stack decided (Next.js, React Native, Supabase)
- ✅ Next.js 16 project scaffolded (TypeScript, Tailwind, App Router)
- ✅ Navbar component (responsive, mobile menu)
- ✅ Homepage — hero, features, featured Traviis, CTA sections, footer
- ✅ Explore page — search + tag filters, real-time filtering
- ✅ My Traviis page — user dashboard with trip stats
- ✅ Travi Detail page — stop timeline, reviews, sidebar stats, share CTA
- ✅ TraviCard component — cards with cover, author, tags, stats
- ✅ Mock data — 6 rich Traviis across Italy, Japan, France, Greece, Thailand, Portugal
- ✅ Build passing — all 5 routes (/, /explore, /my-traviis, /travi/[id])
- ✅ GitHub repo live — https://github.com/StingRei26/travi
- ✅ Deployed to Vercel — https://travi-snowy.vercel.app

### Up Next
- [ ] Auth pages (sign up / login)
- [ ] "Create Travi" flow — multi-step form to plan a new trip
- [ ] Add stop flow — search location, add review/rating
- [ ] Map view integration (Mapbox or Leaflet)
- [ ] Social sharing card generator

---

## 💡 Claude's Thoughts on Travi

Travi has a genuine gap in the market to fill. Here's my honest take:

**What's strong:**
- The social discovery angle (browsing other people's Traviis) is the killer feature — it's Pinterest meets Google Maps meets travel journaling
- Combining planning + logging + booking in one app removes real friction for travelers
- The name "Travi" is catchy, short, and memorable

**Things to watch:**
- **Content cold start problem** — the app is only as good as the Traviis in it. Early growth strategy should focus on getting travel creators and influencers onboard to seed content
- **Booking complexity** — integrating real booking APIs (OpenTable, Booking.com) is technically heavy; consider starting with manual "add a reservation" logging, then layering in live booking later
- **Differentiation from Polarsteps** — Polarsteps is well-funded and strong; Travi's edge needs to be the social discovery + booking combo working seamlessly together

**Biggest opportunity:**
- Group travel planning is hugely underserved. If Travi lets multiple people collaborate on one Travi together, that's a massive differentiator.

---

*Last updated: March 11, 2026*
