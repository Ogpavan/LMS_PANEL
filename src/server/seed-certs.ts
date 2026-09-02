import "dotenv/config";
import { prisma } from "@/server/prisma";

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "certificate_templates" (
      "id" SERIAL PRIMARY KEY,
      "name" VARCHAR(255) NOT NULL,
      "course_title" VARCHAR(255) NOT NULL,
      "status" VARCHAR(50) NOT NULL DEFAULT 'active',
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "issued_certificates" (
      "id" SERIAL PRIMARY KEY,
      "certificate_number" VARCHAR(255) UNIQUE NOT NULL,
      "template_id" INT NOT NULL REFERENCES "certificate_templates"("id") ON DELETE CASCADE,
      "student_name" VARCHAR(255) NOT NULL,
      "student_email" VARCHAR(255) NOT NULL,
      "course_title" VARCHAR(255) NOT NULL,
      "status" VARCHAR(50) NOT NULL DEFAULT 'issued',
      "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const count = await prisma.certificateTemplate.count();
  console.log("Current Certificate Templates in DB:", count);

  if (count === 0) {
    const t1 = await prisma.certificateTemplate.create({
      data: {
        name: "Completion Pro Template",
        courseTitle: "Frontend Mastery",
        status: "active"
      }
    });

    const t2 = await prisma.certificateTemplate.create({
      data: {
        name: "Leadership Gold Certificate",
        courseTitle: "Team Management",
        status: "active"
      }
    });

    await prisma.certificateTemplate.create({
      data: {
        name: "AI Foundations Certificate",
        courseTitle: "AI Foundations",
        status: "pending"
      }
    });

    await prisma.issuedCertificate.createMany({
      data: [
        {
          certificateNumber: "CRT-1001",
          templateId: t1.id,
          studentName: "Ira Shah",
          studentEmail: "ira@demo.com",
          courseTitle: "Frontend Mastery",
          status: "issued"
        },
        {
          certificateNumber: "CRT-1002",
          templateId: t1.id,
          studentName: "Dev Patel",
          studentEmail: "dev@demo.com",
          courseTitle: "Frontend Mastery",
          status: "issued"
        },
        {
          certificateNumber: "CRT-1003",
          templateId: t2.id,
          studentName: "Sara Khan",
          studentEmail: "sara@demo.com",
          courseTitle: "Team Management",
          status: "issued"
        }
      ]
    });

    console.log("Seeded sample templates and issued certificates into PostgreSQL!");
  }
}

main().catch(console.error);
