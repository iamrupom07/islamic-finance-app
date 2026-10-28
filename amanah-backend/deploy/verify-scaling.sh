#!/usr/bin/env bash
set -euo pipefail
: "${PROJECT_ID:?Set project}" "${REGION:?Set region}"
gcloud run services describe amanah-api --project "$PROJECT_ID" --region "$REGION" --format=json
printf '%s\n' 'Verify automatic scaling, service min 0, revision min 0, request-based CPU, max and concurrency caps. Observe zero idle instances and an HTTPS wake-up; CLI output alone does not prove cold-start behavior.'
