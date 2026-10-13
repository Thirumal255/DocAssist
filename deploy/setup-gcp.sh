#!/usr/bin/env bash
# One-time setup of a fresh Google Cloud project for DocAssist.
#
# Creates (and is safe to re-run; existing resources are kept):
#   - Artifact Registry repo for backend images
#   - Cloud SQL Postgres 16 instance, database and app user (Mumbai)
#   - Private Cloud Storage bucket for logos and signatures
#   - Secret Manager secrets: database URL, JWT secret, admin password, (optional) OpenAI key
#   - Runtime service account for Cloud Run, deployer service account for GitHub Actions
#   - Workload Identity Federation so GitHub Actions deploys without any JSON key
#
# Usage:
#   gcloud auth login
#   PROJECT_ID=docassist-prod-123 GITHUB_REPO=Thirumal255/DocAssist \
#   ADMIN_EMAIL=you@example.com [OPENAI_API_KEY=sk-...] ./deploy/setup-gcp.sh
#
# The project must already exist with billing enabled.

set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID (an existing GCP project with billing enabled)}"
: "${GITHUB_REPO:?Set GITHUB_REPO, e.g. Thirumal255/DocAssist}"
: "${ADMIN_EMAIL:?Set ADMIN_EMAIL for the first clinic admin account}"
REGION="${REGION:-asia-south1}"
SQL_INSTANCE="${SQL_INSTANCE:-docassist-db}"
SQL_TIER="${SQL_TIER:-db-f1-micro}"
DB_NAME="${DB_NAME:-docassist}"
DB_USER="${DB_USER:-docassist_app}"
AR_REPO="${AR_REPO:-docassist}"
BUCKET="${BUCKET:-${PROJECT_ID}-docassist-uploads}"
RUNTIME_SA_NAME="docassist-run"
DEPLOYER_SA_NAME="docassist-deployer"
WIF_POOL="github"
WIF_PROVIDER="github-oidc"

RUNTIME_SA="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
DEPLOYER_SA="${DEPLOYER_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
exists() { "$@" >/dev/null 2>&1; }
random_secret() { openssl rand -hex "${1:-32}"; }

# Creates a secret with an initial value, or leaves an existing one untouched.
ensure_secret() {
  local name="$1" value="$2"
  if exists gcloud secrets describe "$name" --project "$PROJECT_ID"; then
    echo "secret $name already exists (unchanged)"
  else
    printf '%s' "$value" | gcloud secrets create "$name" --project "$PROJECT_ID" \
      --replication-policy=user-managed --locations="$REGION" --data-file=- >/dev/null
    echo "created secret $name"
  fi
  gcloud secrets add-iam-policy-binding "$name" --project "$PROJECT_ID" \
    --member="serviceAccount:${RUNTIME_SA}" --role=roles/secretmanager.secretAccessor >/dev/null
}

gcloud config set project "$PROJECT_ID" >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"

log "Enabling APIs (takes a minute the first time)"
gcloud services enable \
  run.googleapis.com sqladmin.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com iam.googleapis.com iamcredentials.googleapis.com \
  sts.googleapis.com cloudresourcemanager.googleapis.com storage.googleapis.com

log "Service accounts"
for sa in "$RUNTIME_SA_NAME:DocAssist Cloud Run runtime" "$DEPLOYER_SA_NAME:DocAssist GitHub deployer"; do
  name="${sa%%:*}"; display="${sa#*:}"
  if ! exists gcloud iam service-accounts describe "${name}@${PROJECT_ID}.iam.gserviceaccount.com"; then
    gcloud iam service-accounts create "$name" --display-name="$display"
  fi
done
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${RUNTIME_SA}" \
  --role=roles/cloudsql.client --condition=None >/dev/null
for role in roles/run.admin roles/cloudsql.viewer roles/secretmanager.viewer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${DEPLOYER_SA}" \
    --role="$role" --condition=None >/dev/null
done
# The deployer may deploy services and jobs that run as the runtime account.
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --member="serviceAccount:${DEPLOYER_SA}" --role=roles/iam.serviceAccountUser >/dev/null

log "Artifact Registry"
if ! exists gcloud artifacts repositories describe "$AR_REPO" --location "$REGION"; then
  gcloud artifacts repositories create "$AR_REPO" --repository-format=docker --location="$REGION" \
    --description="DocAssist backend images"
fi
gcloud artifacts repositories add-iam-policy-binding "$AR_REPO" --location "$REGION" \
  --member="serviceAccount:${DEPLOYER_SA}" --role=roles/artifactregistry.writer >/dev/null

log "Cloud SQL: ${SQL_INSTANCE} (${SQL_TIER}, Postgres 16, ${REGION})"
if ! exists gcloud sql instances describe "$SQL_INSTANCE"; then
  echo "Creating the instance takes 5-10 minutes..."
  # Public IP with no authorized networks: the only way in is the Cloud SQL
  # connector (IAM-checked, encrypted), used by Cloud Run and the Auth Proxy.
  gcloud sql instances create "$SQL_INSTANCE" \
    --database-version=POSTGRES_16 --edition=enterprise --tier="$SQL_TIER" \
    --region="$REGION" --availability-type=zonal \
    --storage-auto-increase --backup-start-time=20:30 --enable-point-in-time-recovery \
    --ssl-mode=ENCRYPTED_ONLY --deletion-protection \
    --root-password="$(random_secret 24)"
fi
if ! exists gcloud sql databases describe "$DB_NAME" --instance "$SQL_INSTANCE"; then
  gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE"
fi
SQL_CONNECTION="$(gcloud sql instances describe "$SQL_INSTANCE" --format='value(connectionName)')"

# The app user's password exists only inside the DATABASE_URL secret.
if exists gcloud secrets describe docassist-database-url --project "$PROJECT_ID"; then
  echo "database user and docassist-database-url secret already set up (unchanged)"
else
  DB_PASSWORD="$(random_secret 24)" # hex only: safe inside a URL
  if exists gcloud sql users describe "$DB_USER" --instance "$SQL_INSTANCE"; then
    gcloud sql users set-password "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASSWORD"
  else
    gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASSWORD"
  fi
  # connection_limit keeps (max instances x pool size) under the small tier's connection cap.
  ensure_secret docassist-database-url \
    "postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?host=/cloudsql/${SQL_CONNECTION}&connection_limit=5&pool_timeout=20"
  unset DB_PASSWORD
fi
gcloud secrets add-iam-policy-binding docassist-database-url --project "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" --role=roles/secretmanager.secretAccessor >/dev/null

log "Secrets"
ensure_secret docassist-jwt-secret "$(random_secret 48)"
ensure_secret docassist-admin-password "$(random_secret 12)"
if [[ -n "${OPENAI_API_KEY:-}" ]]; then
  ensure_secret docassist-openai-api-key "$OPENAI_API_KEY"
else
  echo "OPENAI_API_KEY not given: AI suggestions stay off (database suggestions still work)."
  echo "Add later: printf 'sk-...' | gcloud secrets create docassist-openai-api-key --replication-policy=user-managed --locations=$REGION --data-file=-"
fi

log "Upload bucket gs://${BUCKET}"
if ! exists gcloud storage buckets describe "gs://${BUCKET}"; then
  gcloud storage buckets create "gs://${BUCKET}" --location="$REGION" \
    --uniform-bucket-level-access --public-access-prevention
fi
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:${RUNTIME_SA}" --role=roles/storage.objectAdmin >/dev/null

log "Workload Identity Federation for ${GITHUB_REPO}"
if ! exists gcloud iam workload-identity-pools describe "$WIF_POOL" --location=global; then
  gcloud iam workload-identity-pools create "$WIF_POOL" --location=global --display-name="GitHub Actions"
fi
if ! exists gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" --workload-identity-pool="$WIF_POOL" --location=global; then
  gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER" \
    --location=global --workload-identity-pool="$WIF_POOL" --display-name="GitHub OIDC" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='${GITHUB_REPO}'"
fi
gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_SA" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}/attribute.repository/${GITHUB_REPO}" >/dev/null
WIF_PROVIDER_NAME="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}/providers/${WIF_PROVIDER}"

cat <<EOF

==============================================================================
 Done. Next steps (also in DEPLOYMENT.md):

 1. Set these GitHub repository variables (Settings > Secrets and variables >
    Actions > Variables), or run:

    gh variable set GCP_PROJECT_ID     --repo ${GITHUB_REPO} --body "${PROJECT_ID}"
    gh variable set GCP_REGION         --repo ${GITHUB_REPO} --body "${REGION}"
    gh variable set GCP_WIF_PROVIDER   --repo ${GITHUB_REPO} --body "${WIF_PROVIDER_NAME}"
    gh variable set GCP_DEPLOYER_SA    --repo ${GITHUB_REPO} --body "${DEPLOYER_SA}"
    gh variable set GCP_RUNTIME_SA     --repo ${GITHUB_REPO} --body "${RUNTIME_SA}"
    gh variable set CLOUDSQL_CONNECTION --repo ${GITHUB_REPO} --body "${SQL_CONNECTION}"
    gh variable set GCS_BUCKET         --repo ${GITHUB_REPO} --body "${BUCKET}"
    gh variable set ADMIN_EMAIL        --repo ${GITHUB_REPO} --body "${ADMIN_EMAIL}"

 2. Push to main (or run the "Deploy backend" workflow). It builds the image,
    runs database migrations and deploys the API.

 3. Run the "Deploy backend" workflow once more with task = bootstrap to load
    the medicine database and create the admin account (${ADMIN_EMAIL}).
    Admin password:
      gcloud secrets versions access latest --secret=docassist-admin-password
==============================================================================
EOF
