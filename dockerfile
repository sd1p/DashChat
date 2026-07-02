FROM oven/bun:1-alpine

WORKDIR /usr/src/app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

# Generate the Prisma client, then compile the TypeScript backend to dist/.
# This image is the API-only backend (Express + Socket.IO + Prisma). The
# frontend is built and served by its own image (frontend/Dockerfile).
RUN bun run prisma:generate && bun run build

# Backend listens on PORT (defaults to 5001 in config); expose it.
EXPOSE 5001

# On start: apply pending migrations, then run the server. (The free Render
# plan has no preDeployCommand, so migrations run here on each boot.)
# entrypoint.sh is already present from `COPY . .` above; just make it runnable.
RUN chmod +x backend/entrypoint.sh
CMD [ "backend/entrypoint.sh" ]
