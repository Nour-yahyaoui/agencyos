# AgencyOS Web — Next.js App Router. Build context is the repository root:
#   docker build -f apps/web/Dockerfile -t agencyos-web .
FROM node:20-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY apps/web apps/web
# Browser code calls the same-origin relative path /api/v1; Next rewrites proxy it.
ENV NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w @agencyos/web

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /repo
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/apps/web/package.json ./apps/web/package.json
COPY --from=build /repo/apps/web/.next ./apps/web/.next
COPY --from=build /repo/apps/web/public ./apps/web/public
COPY --from=build /repo/apps/web/next.config.ts ./apps/web/next.config.ts
COPY --from=build /repo/apps/web/tsconfig.json ./apps/web/tsconfig.json
USER node
EXPOSE 3000
WORKDIR /repo/apps/web
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["/repo/node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
