# travi.

> **Your journey, shared.** — A social travel platform for planning trips, logging experiences, discovering destinations, and booking reservations.

## Project Structure

```
travi/
├── travi-web/          # Next.js web app (TypeScript + Tailwind)
├── travi-mobile/       # React Native / Expo mobile app (coming soon)
├── TRAVI_PROGRESS.md   # App build log & business plan
└── README.md
```

## Web App

Built with **Next.js 16**, **TypeScript**, and inline styles.

```bash
cd travi-web
npm install
npm run dev
# → http://localhost:3000
```

## Deployment

- **Web:** [Vercel](https://vercel.com) — set root directory to `travi-web`
- **Mobile:** Expo EAS Build (coming soon)

## Pages

| Route | Description |
|---|---|
| `/` | Landing page — hero, features, featured Traviis |
| `/explore` | Discover public Traviis with search & filters |
| `/my-traviis` | Personal trip dashboard |
| `/travi/[id]` | Individual Travi detail with stop timeline |

---

*See `TRAVI_PROGRESS.md` for full build log and business plan.*
