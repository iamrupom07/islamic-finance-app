# Amanah — Islamic Personal Finance & Zakat App

An Islamic personal finance, zakat calculation, debt management, and Quran reading application built with a modern React Native (Expo) frontend and Fastify (Node.js/TypeScript) backend.

## 📁 Repository Structure

```
islamic-finance-app/
├── amanah-frontend/       # Mobile & Web client (Expo, React Native, TypeScript)
│   ├── src/
│   │   ├── app/           # Expo Router file-based navigation
│   │   ├── design-system/ # Reusable UI components, tokens & floating dock
│   │   ├── features/      # Feature modules (home, assets, debts, quran, finance, onboarding)
│   │   └── core/          # API client, state, auth & localization
│   └── package.json
│
├── amanah-backend/        # REST API & platform services (Fastify, Prisma, PostgreSQL)
│   ├── src/
│   │   ├── modules/       # Zakat calculation engine, prayer timings, exchange rates
│   │   ├── platform/      # Auth, security, tokens, database adapters
│   │   └── jobs/          # Background sync jobs
│   └── package.json
│
└── README.md
```

## ✨ Core Features

- **Personal Finance & Cash Flow**: Track monthly income, expenses, and transaction categorizations.
- **Zakat Estimation Engine**: Accurate calculation adhering to Hanafi and Shafi'i standards based on gold and silver nisab thresholds.
- **Recorded Assets & Holdings**: Comprehensive tracking of cash, savings, gold, silver, and investments with real-time valuation.
- **Debts Tracking**: Settle and monitor "I owe" vs "Owed to me" records with due date tracking and past-due alerts.
- **Quran Surah Library**: Full 114 Surah catalog with Arabic calligraphy, transliteration, English titles, ayah counts, and continue reading bookmarks.
- **Prayer Timings & Countdown**: Location-based prayer times with real-time countdown to the next prayer.
- **Responsive Across Devices**: Adaptive layouts tailored for iOS, Android, tablets, and desktop web browsers.
- **Light & Dark Mode**: Cohesive color palette with custom design tokens.

## 🚀 Getting Started

### Prerequisites

- Node.js (v24+)
- pnpm (v11+)

### Running the Backend

```bash
cd amanah-backend
pnpm install
pnpm dev
```
The API server starts on `http://localhost:8080`.

### Running the Frontend

```bash
cd amanah-frontend
pnpm install
npx expo start
```
- Open `http://localhost:8081` in your browser for the web app.
- Press `i` to launch in iOS simulator or `a` for Android emulator.

## 🧪 Testing

```bash
# Frontend tests (Jest)
cd amanah-frontend && pnpm test

# Backend tests (Vitest)
cd amanah-backend && pnpm test
```

## 📄 License

Private & Proprietary. All rights reserved.
