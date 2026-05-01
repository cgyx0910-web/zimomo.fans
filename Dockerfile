FROM node:20-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

ARG DEPLOYMENT_ENV=production
ARG NEXT_PUBLIC_SITE_URL
ENV DEPLOYMENT_ENV=$DEPLOYMENT_ENV
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter web build

EXPOSE 3000

CMD ["pnpm", "--filter", "web", "start", "-p", "3000"]
