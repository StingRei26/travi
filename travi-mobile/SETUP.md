# Travi Mobile — iOS App

Built with **Expo + React Native**. Shares the same Supabase backend as the web app.

---

## First-time setup

### 1. Install dependencies
```bash
cd travi-mobile
npm install
```

### 2. Add your Supabase credentials
Copy `.env.local` and fill in your values from your Supabase project settings → API:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```
These are the same keys you use in `travi-web/.env.local`.

### 3. Run on your iPhone (no Xcode required)
```bash
npx expo start
```
Then:
1. Install **Expo Go** from the App Store on your iPhone
2. Scan the QR code that appears in the terminal
3. The app loads live on your phone — any code change reloads instantly

---

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Sign In | `/(auth)/sign-in` | Email/password login |
| Sign Up | `/(auth)/sign-up` | Create account |
| Explore | `/(tabs)/explore` | Browse public Travis |
| My Travis | `/(tabs)/my-traviis` | Your trips + shared |
| Create Travi | `/plan` | 4-step creation flow |
| Travi Detail | `/travi/[id]` | Full trip view + stops |

---

## When ready for the App Store

### Option A — Expo EAS Build (recommended, no Xcode needed)
```bash
npm install -g eas-cli
eas login
eas build --platform ios
```
EAS builds the `.ipa` in the cloud and you submit via App Store Connect.

### Option B — Local Xcode build
```bash
npx expo run:ios
```
Requires Xcode 15+ and an Apple Developer account ($99/year).

---

## Project structure
```
travi-mobile/
├── app/
│   ├── _layout.tsx          ← Root layout + auth guard
│   ├── (auth)/
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx      ← Bottom tab bar
│   │   ├── explore.tsx      ← Explore public Travis
│   │   └── my-traviis.tsx   ← My Travis dashboard
│   ├── plan/
│   │   └── index.tsx        ← Create Travi (4-step flow)
│   └── travi/
│       └── [id].tsx         ← Travi detail view
├── components/
│   └── TraviCard.tsx
├── lib/
│   └── supabase.ts          ← Supabase client (AsyncStorage)
├── app.json                 ← Expo config
└── .env.local               ← Your Supabase keys (never commit this)
```
