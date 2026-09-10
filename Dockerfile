# Сборка сайта и CRM.
#
# Три образа из одного файла:
#   deps     — только зависимости, чтобы пересборка кода не тянула npm ci;
#   migrator — полный набор с prisma CLI, выполняет миграции разово на старте;
#   runner   — то, что работает постоянно: standalone-сервер без node_modules.
#
# Разделение нужно потому, что prisma CLI тянет много транзитивных пакетов
# (@prisma/config → effect и прочее), а клиент Prisma 7 генерируется в виде
# исходников TypeScript — их нужно чем-то исполнять. Тащить всё это в
# постоянный образ незачем.

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

# Одноразовый контейнер обслуживания базы: приводит схему в порядок и
# досоздаёт то, без чего CRM не запустить (стадии, услуги, администратор).
FROM builder AS migrator
WORKDIR /app
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/bootstrap.ts && chown -R 1001:1001 /app/data-db"]

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Не работаем от root.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Каталог под файл SQLite: он монтируется томом, иначе база умрёт с контейнером.
RUN mkdir -p /app/data-db && chown nextjs:nodejs /app/data-db

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
