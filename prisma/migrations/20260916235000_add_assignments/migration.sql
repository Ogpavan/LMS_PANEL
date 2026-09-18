-- CreateTable
CREATE TABLE IF NOT EXISTS "assignments" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "course_id" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "total_marks" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "assignments_course_id_idx" ON "assignments"("course_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "assignments_created_at_id_idx" ON "assignments"("created_at" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "assignments" DROP CONSTRAINT IF EXISTS "assignments_course_id_fkey";
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
