# Verification performed

| Check                                                                                                         | Result                                                                   |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Backend frozen dependency install, Prisma generation, TypeScript, lint, compilation, OpenAPI drift            | Passed                                                                   |
| Backend unit/provider/security cases                                                                          | 48 tests passed                                                          |
| Fresh PostgreSQL 16 database, all three migrations, integration journeys                                      | Passed; 6 integration tests                                              |
| Mobile TypeScript, lint, generated SDK/runtime contract drift, required route checks                          | Passed                                                                   |
| Mobile unit, render, contract, session, encryption and notification planning tests                            | 79 tests passed                                                          |
| Native source screen mapping                                                                                  | All 66 source prompts mapped; 46 route destinations resolve              |
| Android Metro export with Hermes compilation                                                                  | Passed; .hbc output generated                                            |
| iOS Metro export with Hermes compilation                                                                      | Passed; .hbc output generated                                            |
| Expo installed-package compatibility check                                                                    | Passed using the installed SDK's offline matrix                          |
| Content manifest without approved input                                                                       | Correctly reported unavailable; no unapproved text rendered              |
| Dependency audit                                                                                              | Backend 0 known advisories; Expo CLI chain 2 high advisories, documented |
| Real Android/iOS installation, signing, notifications/SQLCipher on hardware                                   | NOT VERIFIED; requires native devices/toolchains/signing                 |
| Docker build/run/scan, cloud deployment/IAM, live vendor integrations, backup restore and staging performance | NOT VERIFIED; requires external infrastructure/tools/accounts            |

The tests use synthetic nonproduction fixtures. Integration tests exercise account verification/login, money precision, user isolation, retry/concurrency protection, version conflicts, reporting, settlement, exports, recovery, deletion, cursor ownership, partial zakat records, immutable snapshots and refresh replay. Screen render tests cover loading/content-gated layouts and selected interactions; they do not assert that every device/state combination has been manually tested.

The local PostgreSQL binaries ran in the coding container with an isolated test-only startup UID shim because the container maps only UID 0. The database engine, transactions, indexes, triggers and constraints were real PostgreSQL 16. The shim is not included in the application or archive. CI uses a normal isolated PostgreSQL service. No production database or user account was used.

See RELEASE_GATES.md for the remaining external release evidence and dependency findings. A successful JS/Hermes export is not an installable APK/IPA or a substitute for device QA.
