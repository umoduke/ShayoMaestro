# API Server image for Azure App Service (Web App for Containers)
# Build context must be the repository root:
#   docker build -f deploy/azure/Dockerfile -t asl-api .

# ---- Build stage ----
FROM node:24-slim AS build
RUN corepack enable
WORKDIR /repo

# Install workspace deps (cached unless lockfile changes)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json tsconfig.json ./
COPY lib ./lib
COPY artifacts/api-server ./artifacts/api-server
RUN pnpm install --frozen-lockfile --filter @workspace/api-server... 

# Bundle the server (esbuild -> dist/index.mjs)
RUN pnpm --filter @workspace/api-server run build

# Produce a pruned production package (node_modules for esbuild externals:
# @google-cloud/storage, google-auth-library, applicationinsights, ...)
# --legacy is required on pnpm v10 for non-injected workspaces
RUN pnpm --filter @workspace/api-server --prod deploy --legacy /out
RUN cp -r /repo/artifacts/api-server/dist /out/dist

# ---- Runtime stage ----
FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out /app

# App Service injects PORT (via WEBSITES_PORT); default for local runs
ENV PORT=8080
EXPOSE 8080

USER node
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
