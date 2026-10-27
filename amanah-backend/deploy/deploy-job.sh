#!/usr/bin/env bash
set -euo pipefail
: "${PROJECT_ID:?Set project}" "${REGION:?Set region}" "${IMAGE:?Set immutable image digest}" "${JOB_SECRET_BINDINGS:?Set version-pinned database and provider secrets}"
gcloud run jobs deploy amanah-refresh-rates --project "$PROJECT_ID" --region "$REGION" --image "$IMAGE" --service-account "amanah-job-sa@${PROJECT_ID}.iam.gserviceaccount.com" --command node --args dist/jobs/refresh-rates.main.js --tasks 1 --parallelism 1 --max-retries 1 --task-timeout 10m --set-env-vars NODE_ENV=production,GOLD_QUOTE_UNIT=USD_PER_TROY_OUNCE --set-secrets "$JOB_SECRET_BINDINGS"
