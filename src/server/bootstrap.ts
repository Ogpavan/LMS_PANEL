import { prisma } from "@/server/prisma";
import { createCategorySlug, createCourseSlug } from "@/server/course";
import { hashPassword, isPasswordHash } from "@/server/password";
import { generalSettingsDefaults } from "@/lib/general-settings";
import { paymentSettingsDefaults } from "@/lib/payment-settings";

let bootstrapPromise: Promise<void> | null = null;

async function ensureSupportTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "support_enquiries" (
      "id" SERIAL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "phone" TEXT NOT NULL DEFAULT '',
      "topic" TEXT NOT NULL,
      "course_title" TEXT NOT NULL DEFAULT '',
      "channel" TEXT NOT NULL DEFAULT 'email',
      "message" TEXT NOT NULL DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'open',
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "support_feedback" (
      "id" SERIAL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "course_title" TEXT NOT NULL DEFAULT '',
      "category" TEXT NOT NULL DEFAULT 'general',
      "rating" INTEGER NOT NULL DEFAULT 5,
      "message" TEXT NOT NULL DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'pending',
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "support_tickets" (
      "id" SERIAL PRIMARY KEY,
      "ticket_number" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "requester_name" TEXT NOT NULL,
      "requester_email" TEXT NOT NULL,
      "assigned_to" TEXT NOT NULL DEFAULT '',
      "priority" TEXT NOT NULL DEFAULT 'medium',
      "channel" TEXT NOT NULL DEFAULT 'portal',
      "details" TEXT NOT NULL DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'open',
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "support_tickets_ticket_number_key"
    ON "support_tickets" ("ticket_number")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "lms_general_settings" (
      "id" INTEGER PRIMARY KEY,
      "lms_name" TEXT NOT NULL,
      "support_email" TEXT NOT NULL,
      "support_contact" TEXT NOT NULL,
      "tagline" TEXT NOT NULL DEFAULT '',
      "primary_color" TEXT NOT NULL,
      "accent_color" TEXT NOT NULL,
      "heading_font" TEXT NOT NULL,
      "body_font" TEXT NOT NULL,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "lms_general_settings" (
      "id",
      "lms_name",
      "support_email",
      "support_contact",
      "tagline",
      "primary_color",
      "accent_color",
      "heading_font",
      "body_font"
    )
    VALUES (
      1,
      '${generalSettingsDefaults.lmsName.replace(/'/g, "''")}',
      '${generalSettingsDefaults.supportEmail.replace(/'/g, "''")}',
      '${generalSettingsDefaults.supportContact.replace(/'/g, "''")}',
      '${generalSettingsDefaults.tagline.replace(/'/g, "''")}',
      '${generalSettingsDefaults.primaryColor}',
      '${generalSettingsDefaults.accentColor}',
      '${generalSettingsDefaults.headingFont.replace(/'/g, "''")}',
      '${generalSettingsDefaults.bodyFont.replace(/'/g, "''")}'
    )
    ON CONFLICT ("id") DO NOTHING
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "lms_payment_settings" (
      "id" INTEGER PRIMARY KEY,
      "active_gateway" TEXT NOT NULL,
      "currency" TEXT NOT NULL,
      "tax_mode" TEXT NOT NULL,
      "invoice_prefix" TEXT NOT NULL,
      "razorpay_key_id" TEXT NOT NULL DEFAULT '',
      "razorpay_key_secret" TEXT NOT NULL DEFAULT '',
      "stripe_publishable_key" TEXT NOT NULL DEFAULT '',
      "stripe_secret_key" TEXT NOT NULL DEFAULT '',
      "webhook_secret" TEXT NOT NULL DEFAULT '',
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "lms_payment_settings" (
      "id",
      "active_gateway",
      "currency",
      "tax_mode",
      "invoice_prefix",
      "razorpay_key_id",
      "razorpay_key_secret",
      "stripe_publishable_key",
      "stripe_secret_key",
      "webhook_secret"
    )
    VALUES (
      1,
      '${paymentSettingsDefaults.activeGateway}',
      '${paymentSettingsDefaults.currency}',
      '${paymentSettingsDefaults.taxMode.replace(/'/g, "''")}',
      '${paymentSettingsDefaults.invoicePrefix}',
      '',
      '',
      '',
      '',
      ''
    )
    ON CONFLICT ("id") DO NOTHING
  `);
}

async function bootstrapSchema() {
  await ensureSupportTables();

  await prisma.apiUser.upsert({
    where: { email: "admin@demo.com" },
    update: {
      role: "ADMIN"
    },
    create: {
      name: "Admin User",
      email: "admin@demo.com",
      password: hashPassword("admin"),
      role: "ADMIN"
    }
  });

  await prisma.apiUser.upsert({
    where: { email: "instructor@demo.com" },
    update: {
      role: "INSTRUCTOR"
    },
    create: {
      name: "Instructor User",
      email: "instructor@demo.com",
      password: hashPassword("instructor"),
      role: "INSTRUCTOR"
    }
  });

  await prisma.apiUser.upsert({
    where: { email: "student@demo.com" },
    update: {
      role: "STUDENT"
    },
    create: {
      name: "Student User",
      email: "student@demo.com",
      password: hashPassword("student"),
      role: "STUDENT"
    }
  });

  await upgradeLegacyPasswords();

  const categories = [
    {
      name: "Development",
      slug: createCategorySlug("Development"),
      description: "Engineering, coding, and software delivery programs.",
      status: "active"
    },
    {
      name: "Business",
      slug: createCategorySlug("Business"),
      description: "Strategy, product, analytics, and business growth tracks.",
      status: "active"
    },
    {
      name: "Technology",
      slug: createCategorySlug("Technology"),
      description: "Emerging technology, AI, and technical foundations.",
      status: "active"
    }
  ];

  for (const category of categories) {
    await prisma.courseCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        status: category.status
      },
      create: category
    });
  }

  const courses = [
    {
      title: "Frontend Mastery",
      slug: createCourseSlug("Frontend Mastery"),
      category: "Development",
      instructor: "Avery Brooks",
      shortDescription: "Modern frontend engineering for real product teams.",
      description: "Build production-ready interfaces with React, state management, accessibility, and deployment workflows.",
      thumbnailUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
      price: 14999,
      currency: "INR",
      level: "intermediate",
      durationLabel: "8 weeks",
      language: "English",
      status: "published",
      visibility: "public",
      featured: true
    },
    {
      title: "Product Analytics",
      slug: createCourseSlug("Product Analytics"),
      category: "Business",
      instructor: "Riya Sen",
      shortDescription: "Metrics, funnels, retention, and decision-making for product growth.",
      description: "Learn event design, KPI modeling, dashboards, cohort analysis, and experimentation for product teams.",
      thumbnailUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71",
      price: 12999,
      currency: "INR",
      level: "beginner",
      durationLabel: "6 weeks",
      language: "English",
      status: "draft",
      visibility: "private",
      featured: false
    },
    {
      title: "AI Foundations",
      slug: createCourseSlug("AI Foundations"),
      category: "Technology",
      instructor: "Noah Reed",
      shortDescription: "Core AI concepts, prompting patterns, and practical model workflows.",
      description: "Understand machine learning basics, LLM usage, prompt design, evaluation, and applied AI delivery patterns.",
      thumbnailUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995",
      price: 17999,
      currency: "INR",
      level: "intermediate",
      durationLabel: "10 weeks",
      language: "English",
      status: "published",
      visibility: "public",
      featured: true
    }
  ];

  for (const course of courses) {
    const existing = await prisma.course.findFirst({
      where: { title: course.title }
    });

    if (!existing) {
      await prisma.course.create({ data: course });
    }
  }

  await prisma.student.upsert({
    where: { email: "ira.shah@example.com" },
    update: {},
    create: {
      name: "Ira Shah",
      email: "ira.shah@example.com",
      program: "Frontend Mastery",
      progress: 72,
      status: "active"
    }
  });

  await prisma.student.upsert({
    where: { email: "kabir.jain@example.com" },
    update: {},
    create: {
      name: "Kabir Jain",
      email: "kabir.jain@example.com",
      program: "Product Analytics",
      progress: 64,
      status: "active"
    }
  });

  await prisma.student.upsert({
    where: { email: "sara.khan@example.com" },
    update: {},
    create: {
      name: "Sara Khan",
      email: "sara.khan@example.com",
      program: "AI Foundations",
      progress: 88,
      status: "completed"
    }
  });

  await prisma.student.upsert({
    where: { email: "student@demo.com" },
    update: {},
    create: {
      name: "Student User",
      email: "student@demo.com",
      program: "AI Foundations",
      progress: 35,
      status: "active"
    }
  });
}

async function upgradeLegacyPasswords() {
  const users = await prisma.apiUser.findMany({
    select: {
      id: true,
      password: true
    }
  });

  for (const user of users) {
    if (isPasswordHash(user.password)) {
      continue;
    }

    await prisma.apiUser.update({
      where: { id: user.id },
      data: {
        password: hashPassword(user.password)
      }
    });
  }
}

export async function ensureDatabaseSetup() {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapSchema().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }

  await bootstrapPromise;
}
