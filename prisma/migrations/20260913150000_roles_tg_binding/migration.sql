-- Личный токен сотрудника: по ссылке t.me/<бот>?start=<токен> чат Telegram
-- привязывается к его учётной записи, и бот понимает, чьи заявки туда слать.
ALTER TABLE "User" ADD COLUMN "tgToken" TEXT;
CREATE UNIQUE INDEX "User_tgToken_key" ON "User"("tgToken");

-- Владелец чата. NULL — общий чат отдела: получает все заявки, как раньше.
ALTER TABLE "TelegramChat" ADD COLUMN "userId" TEXT REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "TelegramChat_userId_idx" ON "TelegramChat"("userId");
