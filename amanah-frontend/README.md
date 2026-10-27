# Amanah native mobile app

Expo 58 / React Native 0.88 / React 19.3 / TypeScript. This is the full mobile source repository, including all required destinations and the 66-prompt mapping, not an installable APK/IPA.

## Start

1. Install Node 24 LTS (24.11+ on the 24 line) and pnpm 11.25.0 through Corepack.
2. Run `pnpm install --frozen-lockfile`.
3. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE_URL` to your reachable API ending in `/v1`. For a physical phone, localhost means that phone; use a reachable development host or staging HTTPS URL.
4. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm api:check`, `pnpm routes:check`, and `pnpm content:verify`.
5. Use `pnpm start` with a native development client. Run `pnpm android` or `pnpm ios` with the required native toolchains, or build using EAS. SQLCipher and native sign-in require native builds, not Expo Go.

See `docs/RELEASE.md`, `docs/SCREEN_COVERAGE.json`, `VERIFICATION.md` and `RELEASE_GATES.md`. Fonts and licenses are bundled. No official logo, sacred text, live financial data, provider credentials or store signing assets are fabricated. Import approved Quran/dua content with `node scripts/import-content.mjs /absolute/path/approved.json` and install the same edition on the backend.

This archive supersedes the earlier checkpoint. Extract into a clean directory. If overlaying the checkpoint, follow `FILES_DELETED.txt` to remove the two old tab route files.
