# Pocket Money

A local-first, privacy-focused personal finance app for Sri Lanka. Built as a Progressive Web App (PWA) with an AMOLED-black UI and dynamic theming.

## Features

- **AMOLED Black UI** — true black background for OLED screens
- **Dynamic Theming** — choose your accent color; Material 3 palette generated on the fly
- **Manual Transaction Entry** — quick numpad, categories, accounts, notes
- **Accounts** — track bank accounts, cash, wallets, cards, investments
- **Budgets** — monthly category budgets with progress tracking
- **Goals** — visual savings goals with deadlines
- **Analytics** — spending breakdown and 6-month trend charts
- **Data Ownership** — all data stays in your browser; export to JSON or CSV
- **PWA** — installable on Android and desktop, works offline

## Tech Stack

- React + Vite
- Tailwind CSS
- Zustand (state management)
- Recharts (charts)
- Material Color Utilities (dynamic theming)
- Vite PWA plugin

## Getting Started

You need [Node.js](https://nodejs.org/) installed.

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` folder.

## Installing on Android

1. Open the deployed URL in Chrome.
2. Tap the menu (three dots) → "Add to Home screen".
3. The app will install and run fullscreen like a native app.

## Data Storage

All data is stored in your browser's `localStorage`. Use **Settings → Export Backup** regularly to keep a safe copy. Use **Import Backup** to restore.

## Roadmap

- [ ] Android app wrapper (Capacitor)
- [ ] SMS/notification transaction capture
- [ ] Web companion
- [ ] AI wealth assistant (local-first)
- [ ] Multi-currency support

## License

MIT
