#!/usr/bin/env bash
set -euo pipefail
: "${PROJECT_ID:?Set project}" "${REGION:?Set region}" "${IMAGE:?Set immutable image}" "${ENV_FILE:?Set validated nonsecret env YAML}" "${SECRET_BINDINGS:?Set complete version-pinned secret bindings}"
gcloud run deploy amanah-api --project "$PROJECT_ID" --region "$REGION" --image "$IMAGE" --service-account "amanah-api-sa@${PROJECT_ID}.iam.gserviceaccount.com" --allow-unauthenticated --min 0 --min-instances 0 --max 5 --concurrency 10 --cpu-throttling --memory 512Mi --timeout 30s --env-vars-file "$ENV_FILE" --set-secrets "$SECRET_BINDINGS"
