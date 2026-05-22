WITH ranked_slugs AS (
  SELECT
    "id",
    "slug",
    ROW_NUMBER() OVER (PARTITION BY "slug" ORDER BY "id") AS slug_rank
  FROM "courses"
  WHERE "slug" IS NOT NULL AND "slug" <> ''
)
UPDATE "courses" AS c
SET "slug" = LEFT(c."slug" || '-' || c."id"::text, 80)
FROM ranked_slugs AS ranked
WHERE c."id" = ranked."id"
  AND ranked.slug_rank > 1;
