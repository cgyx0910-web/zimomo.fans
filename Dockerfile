FROM node:20-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

ARG DEPLOYMENT_ENV=production
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG DATABASE_URL=postgresql://guge:guge@127.0.0.1:5432/guge
ENV DEPLOYMENT_ENV=$DEPLOYMENT_ENV
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV DATABASE_URL=$DATABASE_URL

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter web build

EXPOSE 3000

# 启动前执行迁移（需运行时 DATABASE_URL；镜像含 drizzle 迁移文件）
CMD ["sh", "-c", "pnpm db:migrate && pnpm --filter web start -p 3000"]
