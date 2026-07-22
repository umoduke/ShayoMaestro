# ASL — Azure TST / PRD deployment

Three-environment setup:

| Env | Where | Purpose | Paystack keys |
|-----|-------|---------|---------------|
| DEV | Replit (this workspace) | development + preview | TEST |
| TST | Azure App Service | testing / staging | TEST |
| PRD | Azure App Service | production | LIVE |

Only the **API server** runs on Azure. The mobile app ships to phones via
Expo/EAS builds and simply points at a different API base URL per environment.

## One-time setup

### 1. Push this repo to GitHub

Connect the Replit workspace to a GitHub repository (Replit Git pane), or push
manually. CI/CD deploys from the `tst` and `prd` branches.

### 2. Provision Azure (once per environment)

Requires the Azure CLI (`az login`) on your machine or Azure Cloud Shell:

```bash
cd deploy/azure
ALERT_EMAIL=you@example.com ./provision.sh tst
ALERT_EMAIL=you@example.com ./provision.sh prd
```

Each run creates, in region `southafricanorth` (override with `LOCATION=...`):

- Resource group `rg-asl-<env>`
- **App Service** (Linux container) `app-asl-api-<env>` — HTTPS-only, always-on,
  health check on `/api/healthz`
- **PostgreSQL Flexible Server** `pg-asl-<env>` (SSL required)
- **Monitoring**: Log Analytics workspace + Application Insights (request
  traces, dependencies, live metrics — the server auto-enables telemetry when
  `APPLICATIONINSIGHTS_CONNECTION_STRING` is set) + email alerts for
  5xx spikes, slow responses (>3s avg), and failing health checks
- Shared container registry `acraslshared` (first run only)

**Save the `DATABASE_URL` printed at the end** — the generated DB password is
not retrievable later.

### 3. Set the remaining app settings

The script prints the exact command. Per environment set:

- `ADMIN_PASSWORD` — admin login password (use different values per env)
- `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` — TEST keys on tst, LIVE on prd

### 4. Create the GitHub Actions secrets

In the GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `AZURE_CREDENTIALS` | output of `az ad sp create-for-rbac --name asl-deploy --role contributor --scopes /subscriptions/<SUB_ID> --json-auth` |
| `ACR_NAME` | `acraslshared` |
| `TST_DATABASE_URL` | the tst `DATABASE_URL` printed by provision.sh |
| `PRD_DATABASE_URL` | the prd `DATABASE_URL` printed by provision.sh |

Optionally add a GitHub *environment* named `production` with required
reviewers so PRD deploys need manual approval (the workflow already targets it).

### 5. Create the branches

```bash
git branch tst && git push origin tst
git branch prd && git push origin prd
```

## Day-to-day flow

1. Develop and test on Replit (DEV).
2. Merge/push to `tst` → GitHub Actions builds the Docker image, applies the DB
   schema, deploys to TST, and smoke-tests `/api/healthz`.
3. When TST looks good, push/merge the same code to `prd` → same pipeline to PRD.

## Pointing the mobile app at each environment

The Expo app resolves its API base URL at build time. For TST/PRD builds set:

```
EXPO_PUBLIC_API_URL=https://app-asl-api-tst.azurewebsites.net   # TST build
EXPO_PUBLIC_API_URL=https://app-asl-api-prd.azurewebsites.net   # PRD build
```

(DEV builds keep using the Replit URL as today.)

## Monitoring

- **Live metrics**: Azure Portal → Application Insights `appi-asl-<env>` →
  Investigate → Live metrics (requests, failures, CPU in real time)
- **Failures & performance**: same resource → Failures / Performance blades
  show every failing route with stack traces and slowest endpoints
- **Logs**: Log Analytics workspace `log-asl-<env>` — query requests, console
  logs, and dependencies with KQL
- **Alerts**: email to `ALERT_EMAIL` on 5xx spikes, >3s average response time,
  or failing health checks

## Known gaps / caveats

- **Product photo uploads** use Replit object storage (Google Cloud Storage via
  a Replit-specific sidecar). This does NOT work on Azure — on TST/PRD, the
  admin "Upload Photo" button and `/api/storage/*` routes will fail. Options:
  keep uploading photos from DEV, use public image URLs, or port storage to
  Azure Blob Storage (a follow-up task).
- **Schema deploys use `drizzle-kit push`** (same as DEV). It is applied
  automatically by CI before each deploy. For destructive changes (dropping
  columns), review carefully before merging to `prd`.
- **Data does not sync between environments.** Each env has its own database;
  seed products are auto-created on first boot, everything else starts empty.
