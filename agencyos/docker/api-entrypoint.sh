#!/bin/sh
# Applies pending migrations before the API accepts traffic, then hands over to Node.
set -e
cd /repo/apps/api

echo "[entrypoint] applying database migrations"
../../node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma

if [ "$RUN_SEED" = "true" ]; then
  echo "[entrypoint] RUN_SEED=true -> loading demo data (refuses to run when NODE_ENV=production)"
  node dist/prisma/seed.js
fi

echo "[entrypoint] starting API"
exec node dist/src/main.js
