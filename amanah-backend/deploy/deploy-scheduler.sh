#!/usr/bin/env bash
set -euo pipefail
: "${PROJECT_ID:?Set project}" "${REGION:?Set region}"
scheduler_account="amanah-scheduler-sa@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud run jobs add-iam-policy-binding amanah-refresh-rates --project "$PROJECT_ID" --region "$REGION" --member "serviceAccount:${scheduler_account}" --role roles/run.invoker
gcloud scheduler jobs create http amanah-refresh-rates-trigger --project "$PROJECT_ID" --location "$REGION" --schedule '0 3 * * *' --max-retry-attempts 3 --min-backoff 60s --max-backoff 600s --time-zone Etc/UTC --uri "https://run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${REGION}/jobs/amanah-refresh-rates:run" --http-method POST --oauth-service-account-email "$scheduler_account" --attempt-deadline 60s
