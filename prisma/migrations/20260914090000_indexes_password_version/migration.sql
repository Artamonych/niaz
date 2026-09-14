-- Поколение пароля: попадает в сессию, чтобы смена пароля гасила старые куки.
ALTER TABLE "User" ADD COLUMN "passwordVersion" INTEGER NOT NULL DEFAULT 0;

-- Индексы под частые выборки CRM (п. 35 бэклога).
CREATE INDEX "Lead_ownerId_idx" ON "Lead"("ownerId");
CREATE INDEX "Lead_clientId_idx" ON "Lead"("clientId");
CREATE INDEX "Client_managerId_idx" ON "Client"("managerId");
CREATE INDEX "Client_createdAt_idx" ON "Client"("createdAt");
