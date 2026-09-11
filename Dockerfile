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

# better-sqlite3 ставится готовым бинарником, но если prebuild-install не
# достучится до хранилища, npm молча уходит собирать модуль из исходников.
# Без Python и компилятора сборка в этот момент падает — ставим их заранее,
# чтобы результат не зависел от везения с сетью.
#
# Зеркало: dl-cdn (Fastly) с нашего VPS регулярно виснет на крупных пакетах —
# соединение живо, данные не идут, сборка стоит часами на установке gcc.
# Через зеркало Яндекса та же установка проходит за 49 секунд. dl-cdn
# остаётся запасным: если зеркало недоступно, собираемся как раньше.
RUN set -eu;     cp /etc/apk/repositories /etc/apk/repositories.dl-cdn;     sed -i 's|https://dl-cdn.alpinelinux.org/alpine|https://mirror.yandex.ru/mirrors/alpine|g' /etc/apk/repositories;     timeout 300 apk add --no-cache python3 make g++ || {       echo 'Зеркало Яндекса не ответило, пробуем dl-cdn';       cp /etc/apk/repositories.dl-cdn /etc/apk/repositories;       timeout 600 apk add --no-cache python3 make g++;     }

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
#
# Собирается прямо из deps, а не поверх builder: миграциям и bootstrap.ts
# нужны только зависимости, схема и сгенерированный клиент. Раньше в образ
# заодно ехали исходники, собранный .next и все фото каталога — 1,77 ГБ на
# диске VPS, где свободно всего несколько гигабайт.
FROM node:24-alpine AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
RUN npx prisma generate
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/bootstrap.ts && chown -R 1001:1001 /app/data-db"]

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Не работаем от root.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Каталоги под базу и загрузки монтируются томами, иначе умрут с контейнером.
# Создаются заранее от имени nextjs: пустой том при первом подключении
# наследует эти права, и приложение может в него писать.
RUN mkdir -p /app/data-db /app/uploads && chown nextjs:nodejs /app/data-db /app/uploads

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
