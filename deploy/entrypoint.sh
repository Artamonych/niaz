#!/bin/sh
# Старт контейнера: сначала привести схему базы в порядок, потом поднять сервер.
set -e

echo "→ Применяем миграции"
npx prisma migrate deploy

echo "→ Проверяем наполнение базы"
node deploy/bootstrap.mjs

echo "→ Запускаем сервер"
exec node server.js
