import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing required environment variable: DATABASE_URL");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString })
});

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derivedKey}`;
}

function createCourseSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function createCategorySlug(value) {
  return createCourseSlug(value);
}

async function main() {
  await prisma.apiUser.upsert({
    where: { email: "admin@demo.com" },
    update: { role: "ADMIN" },
    create: {
      name: "Admin User",
      email: "admin@demo.com",
      password: hashPassword("admin"),
      role: "ADMIN"
    }
  });

  await prisma.apiUser.upsert({
    where: { email: "instructor@demo.com" },
    update: { role: "INSTRUCTOR" },
    create: {
      name: "Instructor User",
      email: "instructor@demo.com",
      password: hashPassword("instructor"),
      role: "INSTRUCTOR"
    }
  });

  await prisma.apiUser.upsert({
    where: { email: "student@demo.com" },
    update: { role: "STUDENT" },
    create: {
      name: "Student User",
      email: "student@demo.com",
      password: hashPassword("student"),
      role: "STUDENT"
    }
  });

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

  const students = [
    {
      name: "Ira Shah",
      email: "ira.shah@example.com",
      program: "Frontend Mastery",
      progress: 72,
      status: "active"
    },
    {
      name: "Kabir Jain",
      email: "kabir.jain@example.com",
      program: "Product Analytics",
      progress: 64,
      status: "active"
    },
    {
      name: "Sara Khan",
      email: "sara.khan@example.com",
      program: "AI Foundations",
      progress: 88,
      status: "completed"
    },
    {
      name: "Student User",
      email: "student@demo.com",
      program: "AI Foundations",
      progress: 35,
      status: "active"
    }
  ];

  for (const student of students) {
    await prisma.student.upsert({
      where: { email: student.email },
      update: {},
      create: student
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
