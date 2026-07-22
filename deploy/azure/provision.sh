#!/usr/bin/env bash
# Provision one ASL environment (tst or prd) on Azure App Service with monitoring.
# Run once per environment from a machine with the Azure CLI logged in (az login).
#
# Usage:
#   ./provision.sh tst
#   ./provision.sh prd
#
# After running, set the secrets printed at the end (Paystack keys, etc.)
set -euo pipefail

ENV="${1:?Usage: ./provision.sh <tst|prd>}"
[[ "$ENV" == "tst" || "$ENV" == "prd" ]] || { echo "env must be tst or prd"; exit 1; }

# ---- Editable settings ----------------------------------------------------
LOCATION="${LOCATION:-southafricanorth}"        # closest Azure region to Nigeria
APP="asl"                                       # project prefix
RG="rg-${APP}-${ENV}"
ACR="acr${APP}shared"                           # ONE registry shared by tst+prd (created if missing)
ACR_RG="rg-${APP}-shared"
PLAN="plan-${APP}-${ENV}"
WEBAPP="app-${APP}-api-${ENV}"                  # must be globally unique; change if taken
PG_SERVER="pg-${APP}-${ENV}"                    # must be globally unique
PG_DB="asl"
PG_ADMIN="asladmin"
LOG_WS="log-${APP}-${ENV}"
APPINSIGHTS="appi-${APP}-${ENV}"
ALERT_EMAIL="${ALERT_EMAIL:?Set ALERT_EMAIL=you@example.com}"
PLAN_SKU=$([[ "$ENV" == "prd" ]] && echo "P0V3" || echo "B1")
PG_SKU=$([[ "$ENV" == "prd" ]] && echo "Standard_B2s" || echo "Standard_B1ms")
# ---------------------------------------------------------------------------

PG_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=')"
SESSION_SECRET_VALUE="$(openssl rand -hex 32)"

echo "==> Resource group"
az group create -n "$RG" -l "$LOCATION" -o none

echo "==> Container registry (shared)"
az group create -n "$ACR_RG" -l "$LOCATION" -o none
az acr show -n "$ACR" -g "$ACR_RG" -o none 2>/dev/null || \
  az acr create -n "$ACR" -g "$ACR_RG" --sku Basic --admin-enabled false -o none

echo "==> Log Analytics + Application Insights"
az monitor log-analytics workspace create -g "$RG" -n "$LOG_WS" -l "$LOCATION" -o none
LOG_WS_ID=$(az monitor log-analytics workspace show -g "$RG" -n "$LOG_WS" --query id -o tsv)
az monitor app-insights component create -g "$RG" -a "$APPINSIGHTS" -l "$LOCATION" \
  --workspace "$LOG_WS_ID" -o none
AI_CONN=$(az monitor app-insights component show -g "$RG" -a "$APPINSIGHTS" \
  --query connectionString -o tsv)

echo "==> PostgreSQL Flexible Server (public network enabled, NO firewall rules yet)"
az postgres flexible-server create -g "$RG" -n "$PG_SERVER" -l "$LOCATION" \
  --admin-user "$PG_ADMIN" --admin-password "$PG_PASSWORD" \
  --sku-name "$PG_SKU" --tier Burstable --storage-size 32 --version 16 \
  --database-name "$PG_DB" --public-access none -o none
DATABASE_URL="postgresql://${PG_ADMIN}:${PG_PASSWORD}@${PG_SERVER}.postgres.database.azure.com:5432/${PG_DB}?sslmode=require"

echo "==> App Service plan + Web App (Linux container)"
az appservice plan create -g "$RG" -n "$PLAN" --is-linux --sku "$PLAN_SKU" -o none
az webapp create -g "$RG" -n "$WEBAPP" --plan "$PLAN" \
  --container-image-name "mcr.microsoft.com/appsvc/staticsite:latest" -o none

echo "==> Managed identity + ACR pull permission"
az webapp identity assign -g "$RG" -n "$WEBAPP" -o none
PRINCIPAL_ID=$(az webapp identity show -g "$RG" -n "$WEBAPP" --query principalId -o tsv)
ACR_ID=$(az acr show -n "$ACR" -g "$ACR_RG" --query id -o tsv)
az role assignment create --assignee "$PRINCIPAL_ID" --role AcrPull --scope "$ACR_ID" -o none 2>/dev/null || true  # idempotent on re-run
az webapp config set -g "$RG" -n "$WEBAPP" --generic-configurations '{"acrUseManagedIdentityCreds": true}' -o none

echo "==> Database firewall: allow only this web app's outbound IPs"
# Note: outbound IPs can change if the plan is scaled/moved — re-run this block if DB connections fail.
OUTBOUND_IPS=$(az webapp show -g "$RG" -n "$WEBAPP" --query possibleOutboundIpAddresses -o tsv | tr ',' ' ')
i=0
for ip in $OUTBOUND_IPS; do
  az postgres flexible-server firewall-rule create -g "$RG" -n "$PG_SERVER" \
    --rule-name "webapp-${i}" --start-ip-address "$ip" --end-ip-address "$ip" -o none
  i=$((i+1))
done

echo "==> App settings"
az webapp config appsettings set -g "$RG" -n "$WEBAPP" -o none --settings \
  NODE_ENV=production \
  WEBSITES_PORT=8080 \
  PORT=8080 \
  DATABASE_URL="$DATABASE_URL" \
  SESSION_SECRET="$SESSION_SECRET_VALUE" \
  APPLICATIONINSIGHTS_CONNECTION_STRING="$AI_CONN" \
  LOG_LEVEL=info

echo "==> Health check + always-on + HTTPS only"
az webapp config set -g "$RG" -n "$WEBAPP" --always-on true -o none
az webapp update -g "$RG" -n "$WEBAPP" --https-only true -o none
az webapp config set -g "$RG" -n "$WEBAPP" --generic-configurations '{"healthCheckPath": "/api/healthz"}' -o none

echo "==> Monitoring alerts"
az monitor action-group create -g "$RG" -n "ag-${APP}-${ENV}" --short-name "asl${ENV}" \
  --action email admin "$ALERT_EMAIL" -o none
AG_ID=$(az monitor action-group show -g "$RG" -n "ag-${APP}-${ENV}" --query id -o tsv)
APP_ID=$(az webapp show -g "$RG" -n "$WEBAPP" --query id -o tsv)

az monitor metrics alert create -g "$RG" -n "alert-${ENV}-http5xx" \
  --scopes "$APP_ID" --action "$AG_ID" \
  --condition "total Http5xx > 5" --window-size 5m --evaluation-frequency 1m \
  --description "More than 5 server errors in 5 minutes" -o none

az monitor metrics alert create -g "$RG" -n "alert-${ENV}-response-time" \
  --scopes "$APP_ID" --action "$AG_ID" \
  --condition "avg AverageResponseTime > 3" --window-size 5m --evaluation-frequency 5m \
  --description "Average response time above 3s" -o none

az monitor metrics alert create -g "$RG" -n "alert-${ENV}-health" \
  --scopes "$APP_ID" --action "$AG_ID" \
  --condition "avg HealthCheckStatus < 100" --window-size 5m --evaluation-frequency 1m \
  --description "Health check failing" -o none

echo
echo "============================================================"
echo "Environment '$ENV' provisioned."
echo
echo "Web app:      https://${WEBAPP}.azurewebsites.net"
echo "Health:       https://${WEBAPP}.azurewebsites.net/api/healthz"
echo "App Insights: ${APPINSIGHTS} (portal: Investigate > Live metrics)"
echo
echo "DATABASE_URL (SAVE THIS — the password is not retrievable later):"
echo "  $DATABASE_URL"
echo
echo "Still to set manually (az webapp config appsettings set -g $RG -n $WEBAPP --settings KEY=VALUE):"
echo "  ADMIN_PASSWORD          - admin login password for this environment"
echo "  PAYSTACK_SECRET_KEY     - TEST key for tst, LIVE key for prd"
echo "  PAYSTACK_PUBLIC_KEY     - TEST key for tst, LIVE key for prd"
echo
echo "GitHub secrets needed for CI/CD (see README):"
echo "  AZURE_CREDENTIALS, ACR_NAME=${ACR}, plus per-env DATABASE_URL for migrations"
echo "============================================================"
