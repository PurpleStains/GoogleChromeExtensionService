# GoogleChromeExtensionService

## CI/CD (GitHub Actions -> Cloud Run)

Workflow jest w pliku [`.github/workflows/cloud-run-deploy.yml`](.github/workflows/cloud-run-deploy.yml).

Deploy wykonuje sie tylko dla `push` na galez `main` i tylko wtedy, gdy przejda:

- `npm run typecheck:domain`
- `npm run build`
- `npm test -- --runInBand`

### Wymagane GitHub Secrets

- `GCP_WORKLOAD_IDENTITY_PROVIDER` - pelna nazwa providera Workload Identity Federation
- `GCP_SERVICE_ACCOUNT_EMAIL` - email service account uzywanego do deployu

### Wymagane GitHub Variables

- `GCP_PROJECT_ID` - ID projektu GCP
- `GCP_REGION` - region Cloud Run (domyslnie `us-central1`)
- `CLOUD_RUN_SERVICE` - nazwa uslugi Cloud Run (domyslnie `catalog-api`)
- `AR_HOSTNAME` - host Artifact Registry (domyslnie `us-central1-docker.pkg.dev`)
- `AR_REPOSITORY` - repozytorium Artifact Registry (domyslnie `cloud-run-source-deploy`)
- `IMAGE_NAME` - opcjonalna nazwa obrazu (domyslnie nazwa repozytorium)

### Minimalne role dla service account

- `roles/run.admin`
- `roles/artifactregistry.writer`
- `roles/iam.serviceAccountUser`
