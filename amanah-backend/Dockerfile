FROM node:24.22.1-bookworm-slim AS toolchain
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

FROM toolchain AS production-dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM toolchain AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN pnpm prisma:generate && pnpm build \
 && cp -R "$(realpath node_modules/@prisma/client)/../../.prisma/client" /generated-prisma-client

FROM node:24.22.1-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /generated-prisma-client ./node_modules/.prisma/client
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json
USER node
EXPOSE 8080
CMD ["node","dist/main.js"]
