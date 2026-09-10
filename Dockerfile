# Сборка сайта и CRM в самодостаточный образ.
# Многослойно: зависимости отдельно от исходников, чтобы пересборка была быстрой.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Клиент Prisma генерируется в lib/generated и в репозиторий не коммитится.
RUN npx prisma generate

# Адрес нужен на сборке: он попадает в canonical и sitemap.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Не работаем от root.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma нужна в рантайме: миграции и наполнение базы выполняются на старте.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Клиент Prisma и bcrypt нужны скрипту первичного наполнения.
COPY --from=builder /app/lib/generated ./lib/generated
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/@prisma/adapter-better-sqlite3 ./node_modules/@prisma/adapter-better-sqlite3
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY deploy/bootstrap.mjs ./deploy/bootstrap.mjs
COPY deploy/entrypoint.sh ./deploy/entrypoint.sh
RUN chmod +x ./deploy/entrypoint.sh

# Каталог под файл SQLite: он монтируется томом, иначе база умрёт с контейнером.
RUN mkdir -p /app/data-db && chown nextjs:nodejs /app/data-db

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

ENTRYPOINT ["./deploy/entrypoint.sh"]
