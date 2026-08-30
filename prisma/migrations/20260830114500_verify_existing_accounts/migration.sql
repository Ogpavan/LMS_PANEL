-- Accounts created before email verification existed are trusted as already verified.
UPDATE "api_users"
SET "email_verified_at" = CURRENT_TIMESTAMP
WHERE "email_verified_at" IS NULL;
