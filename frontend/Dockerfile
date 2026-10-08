# glibc base so a locally installed node_modules (with its SWC binary) can be reused offline.
FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
# Reuse node_modules from the build context when present (slow/offline networks); otherwise install.
RUN --mount=type=cache,target=/root/.npm [ -d node_modules/next ] || npm install --no-audit --no-fund --fetch-retries=6 --fetch-timeout=180000
ARG API_URL=http://backend:8000
ENV API_URL=$API_URL
RUN rm -rf .next && npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
