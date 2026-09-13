-- Временный пароль при заведении сотрудника: до первой смены в CRM не пускаем.
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
