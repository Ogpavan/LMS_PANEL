ALTER TABLE "courses"
ADD COLUMN IF NOT EXISTS "slug" TEXT;

UPDATE "courses"
SET "slug" = LEFT(
  TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER("title"), '[^a-z0-9]+', '-', 'g')),
  80
)
WHERE "slug" IS NULL OR "slug" = '';
