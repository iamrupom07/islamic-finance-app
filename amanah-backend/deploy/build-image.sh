#!/usr/bin/env bash
set -euo pipefail
: "${PROJECT_ID:?Set project}" "${REGION:?Set region}" "${TAG:?Set immutable source revision tag}"
gcloud builds submit --project "$PROJECT_ID" --tag "${REGION}-docker.pkg.dev/${PROJECT_ID}/amanah/amanah-api:${TAG}" .
