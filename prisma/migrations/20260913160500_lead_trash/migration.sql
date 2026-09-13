-- Корзина заявок: удаление обратимо, безвозвратную чистку делает администратор.
ALTER TABLE "Lead" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "Lead" ADD COLUMN "deletedBy" TEXT;

-- CreateIndex
CREATE INDEX "Lead_deletedAt_idx" ON "Lead"("deletedAt");
