# Amanah API — merged Phase 1 + Phase 2

This is the complete merged source, including the original project and both phases. No earlier ZIP is required. Extract both archives into the same new parent directory, then follow RUN_INSTRUCTIONS.txt. Configure your own environment values; deploy the matching backend and migrations before the mobile app. Historical phase reports are retained for traceability.

The runtime includes content/bundle.json and its independent edition lock. With CONTENT_BUNDLE_PATH unset, the bundled publisher edition is loaded from the backend working directory. An explicit custom path must have a matching edition-lock.json beside it and pass the same schema/hash/count checks. An old approved:false bundle stays unavailable. The Docker image copies bundled content into /app/content; run commands from the backend root.

New behavior: catalog edition compatibility, edition-bound reading positions, corrected strict reading/bookmark response DTOs, complete verified reference validation, and an authenticated readable HTML statement at GET /v1/zakat/history/:id/statement. JSON/CSV/HTML file response media types are described accurately in OpenAPI. Statement rendering escapes user text and uses a self-contained content-security policy.

No new paid API is used. Phase 1 keyless metal/FX/prayer adapters and reviewed zakat/prayer policy gates remain. No policy has been newly approved. Content publisher provenance is separate from independent release review.

Read PHASE2_RUN_COMMANDS.txt, VERIFICATION.md, RELEASE_GATES.md, docs/CONTENT_PROVENANCE.md and docs/PHASE2_OPERATIONS.md. Integration and recovery tools are restricted to explicitly isolated database names. Recovery ledger export is sensitive and must be archived separately from database backups with the original matching identity pepper. Actual cloud backup restoration, incident ownership and signed native release evidence are still external prerequisites.
