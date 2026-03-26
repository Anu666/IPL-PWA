# IPL Gaming PWA (React + Vite)

Progressive Web App built with React and Vite, ready for static deployment on Vercel.

## Install dependencies

npm install

## Run locally

npm run dev

## Build project

npm run build

## Preview production build

npm run preview

## Deploy to Vercel

1. Push this project to GitHub.
2. Import the repository in Vercel.
3. Use these settings:
   - Build Command: npm run build
   - Output Directory: dist
4. Deploy.

The app includes [vercel.json](vercel.json) for SPA routing support on static hosting.

## PWA details

- `vite-plugin-pwa` is configured in [vite.config.ts](vite.config.ts).
- App manifest source exists at [public/manifest.webmanifest](public/manifest.webmanifest).
- Service worker is auto-registered from [src/main.tsx](src/main.tsx) and generated at build time.
- Static asset caching + offline access + automatic updates are enabled.
