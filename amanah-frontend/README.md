# Amanah mobile — merged Phase 1 + Phase 2

This is the complete merged source, including the original project and both phases. No earlier ZIP is required. Extract both archives into the same new parent directory, then follow RUN_INSTRUCTIONS.txt. Configure your own environment values; deploy the matching backend and migrations before the mobile app. Historical phase reports are retained for traceability.

Installed: complete publisher-sourced Quran Arabic and English, all OpenDua source entries, reading controls/progress/bookmarks/search/Juz navigation, shared native Quran audio and permitted downloads, device privacy, themed/Bangla controls, readable assessment sharing and exact-graph release tooling. See IMPLEMENTATION_STATUS.md for feature boundaries. No Dua recording or unsupported Bengali religious translation is substituted.

Read PHASE2_RUN_COMMANDS.txt, VERIFICATION.md, RELEASE_GATES.md, docs/CONTENT_PROVENANCE.md and docs/PHASE2_OPERATIONS.md. The native build must be regenerated for audio/biometric/system-UI/SQLCipher changes. Expo Go, a JS export or a generated native project is not signed-device evidence. Android/iOS are the declared release platforms; web is not verified.

The app bundles text so reading does not require a live content request. Saved reading progress/bookmarks/favorites require the same server edition. “Mark read here” explicitly records the exact verse and timestamp; it does not claim passive scroll tracking. Full-surah audio resumes by recording and seconds on the device and is not ayah synchronized.

Downloads are opt-in, one transfer at a time, require encrypted native metadata, have conservative 256 MiB total/64 MiB recording limits, support pause/retry/discard/deletion and verify local checksums. Files/settings/player metadata are purged on sign-out/account erasure. Audio licensing metadata is distinct from a corruption checksum. Explicit exports and editable amounts remain visible while hide-balances is enabled; external shared copies are outside app control.

Production promotion is intentionally blocked until actual signed artifacts, device/staging/beta/legal/content/religious evidence and named owners are supplied. No production signing, deployment or independent approval has been fabricated.
