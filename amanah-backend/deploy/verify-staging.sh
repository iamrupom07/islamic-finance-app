#!/usr/bin/env bash
set -euo pipefail
umask 077
trap 'rm -f staging-evidence/service-private.json staging-evidence/job-private.json staging-evidence/scheduler-private.json' EXIT
: "${GOOGLE_CLOUD_PROJECT:?Set the staging project}"
: "${REGION:?Set the staging region}"
: "${SERVICE:?Set the staging Cloud Run service}"
: "${JOB:?Set the daily refresh job}"
: "${SCHEDULER:?Set the scheduler job}"
mkdir -p staging-evidence
gcloud run services describe "$SERVICE" --project "$GOOGLE_CLOUD_PROJECT" --region "$REGION" --format=json > staging-evidence/service-private.json
gcloud run jobs describe "$JOB" --project "$GOOGLE_CLOUD_PROJECT" --region "$REGION" --format=json > staging-evidence/job-private.json
gcloud scheduler jobs describe "$SCHEDULER" --project "$GOOGLE_CLOUD_PROJECT" --location "$REGION" --format=json > staging-evidence/scheduler-private.json
node --input-type=module <<'JS'
import fs from 'node:fs';
const service=JSON.parse(fs.readFileSync('staging-evidence/service-private.json'));
const job=JSON.parse(fs.readFileSync('staging-evidence/job-private.json'));
const scheduler=JSON.parse(fs.readFileSync('staging-evidence/scheduler-private.json'));
const template=service.spec?.template,annotations=template?.metadata?.annotations??{};
const container=template?.spec?.containers?.[0];
if(annotations['autoscaling.knative.dev/minScale']&&annotations['autoscaling.knative.dev/minScale']!=='0')throw Error('Expected zero minimum instances.');
if(!template?.spec?.serviceAccountName)throw Error('Explicit API service account required.');
if(!job.spec?.template?.spec?.template?.spec?.serviceAccountName)throw Error('Explicit job service account required.');
if(!scheduler.httpTarget?.oidcToken?.serviceAccountEmail)throw Error('Scheduler OIDC identity required.');
const env=container?.env??[];
for(const name of ['DATABASE_URL','JWT_SIGNING_PRIVATE_KEY','REFRESH_TOKEN_PEPPER','CURSOR_SECRET'])if(!env.find(v=>v.name===name)?.valueFrom?.secretKeyRef)throw Error('Secret Manager reference required for '+name);
const report={capturedAt:new Date().toISOString(),service:service.metadata?.name,image:container?.image,readyRevision:service.status?.latestReadyRevisionName,minimumInstances:annotations['autoscaling.knative.dev/minScale']??'0',concurrency:template?.spec?.containerConcurrency,timeout:template?.spec?.timeoutSeconds,schedule:scheduler.schedule,timezone:scheduler.timeZone,secretValuesOmitted:true,manualChecksRequired:['least-privilege IAM','job execution succeeded and produced a verified snapshot','Neon connections and cold/warm load','alerts delivered','backup restore and deletion replay','traffic rollback']};
fs.writeFileSync('staging-evidence/configuration-report.json',JSON.stringify(report,null,2)+'\n');
for(const name of ['service','job','scheduler'])fs.unlinkSync('staging-evidence/'+name+'-private.json');
console.log('Configuration report created. This does not certify live operations or IAM correctness.');
JS
