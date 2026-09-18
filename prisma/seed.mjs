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
  await prisma.lmsGeneralSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      lmsName: "ETPL Learning Suite",
      supportEmail: "support@etpllms.com",
      supportContact: "+91 98765 43210",
      tagline: "Professional learning operations for modern training teams.",
      primaryColor: "#7367f0",
      accentColor: "#0f766e",
      headingFont: "Poppins",
      bodyFont: "DM Sans"
    }
  });

  await prisma.lmsPaymentSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      activeGateway: "razorpay",
      currency: "INR",
      taxMode: "GST included",
      invoicePrefix: "INV"
    }
  });

  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;

  if (initialAdminEmail && initialAdminPassword) {
    if (
      initialAdminPassword.length < 12 ||
      !/[a-z]/.test(initialAdminPassword) ||
      !/[A-Z]/.test(initialAdminPassword) ||
      !/[0-9]/.test(initialAdminPassword) ||
      !/[^A-Za-z0-9]/.test(initialAdminPassword)
    ) {
      throw new Error(
        "INITIAL_ADMIN_PASSWORD must be at least 12 characters and include upper/lowercase letters, a number, and a symbol"
      );
    }

    await prisma.apiUser.upsert({
      where: { email: initialAdminEmail },
      update: { role: "ADMIN", isActive: true },
      create: {
        name: process.env.INITIAL_ADMIN_NAME?.trim() || "LMS Administrator",
        email: initialAdminEmail,
        password: hashPassword(initialAdminPassword),
        role: "ADMIN",
        emailVerifiedAt: new Date()
      }
    });
  }

  const seedDemoData = process.env.NODE_ENV !== "production" || process.env.SEED_DEMO_DATA === "true";
  if (!seedDemoData) return;

  await prisma.apiUser.upsert({
    where: { email: "admin@demo.com" },
    update: { role: "ADMIN" },
    create: {
      name: "Admin User",
      email: "admin@demo.com",
      password: hashPassword("admin"),
      role: "ADMIN",
      emailVerifiedAt: new Date()
    }
  });

  await prisma.apiUser.upsert({
    where: { email: "instructor@demo.com" },
    update: { role: "INSTRUCTOR" },
    create: {
      name: "Instructor User",
      email: "instructor@demo.com",
      password: hashPassword("instructor"),
      role: "INSTRUCTOR",
      emailVerifiedAt: new Date()
    }
  });

  await prisma.apiUser.upsert({
    where: { email: "student@demo.com" },
    update: { role: "STUDENT" },
    create: {
      name: "Student User",
      email: "student@demo.com",
      password: hashPassword("student"),
      role: "STUDENT",
      emailVerifiedAt: new Date()
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

  const frontendCourse = await prisma.course.findFirst({ where: { title: "Frontend Mastery" } });
  const analyticsCourse = await prisma.course.findFirst({ where: { title: "Product Analytics" } });
  const aiCourse = await prisma.course.findFirst({ where: { title: "AI Foundations" } });

  const sampleAssignments = [
    {
      title: "Capstone Build",
      description: "Build a production-ready dashboard interface using React and Tailwind CSS.",
      courseId: frontendCourse?.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      totalMarks: 100,
      status: "PUBLISHED"
    },
    {
      title: "Dashboard Review",
      description: "Perform cohort analysis and build event funnels for product growth metric analysis.",
      courseId: analyticsCourse?.id,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      totalMarks: 50,
      status: "DRAFT"
    },
    {
      title: "Model Prompt Pack",
      description: "Design and evaluate prompt engineering workflows for LLM integration.",
      courseId: aiCourse?.id,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      totalMarks: 100,
      status: "PUBLISHED"
    }
  ];

  for (const asn of sampleAssignments) {
    if (asn.courseId) {
      const existingAsn = await prisma.assignment.findFirst({
        where: { title: asn.title, courseId: asn.courseId }
      });
      if (!existingAsn) {
        await prisma.assignment.create({ data: asn });
      }
    }
  }

  const sampleQuizzes = [
    {
      title: "Weekly Frontend Checkpoint",
      description: "Test your knowledge of React hooks, state management, and DOM events.",
      courseId: frontendCourse?.id,
      totalMarks: 20,
      passingMarks: 14,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: "PUBLISHED",
      questions: [
        {
          question: "Which hook is used for side-effects in React functional components?",
          type: "multiple_choice",
          marks: 10,
          explanation: "useEffect is standard for running side-effects after render.",
          options: [
            { optionText: "useState", isCorrect: false },
            { optionText: "useEffect", isCorrect: true },
            { optionText: "useContext", isCorrect: false },
            { optionText: "useReducer", isCorrect: false }
          ]
        },
        {
          question: "What does JSX stand for?",
          type: "multiple_choice",
          marks: 10,
          explanation: "JSX stands for JavaScript XML.",
          options: [
            { optionText: "JavaScript XML", isCorrect: true },
            { optionText: "Java Syntax Extension", isCorrect: false },
            { optionText: "JSON Serialization Syntax", isCorrect: false },
            { optionText: "JavaScript Extended Syntax", isCorrect: false }
          ]
        }
      ]
    },
    {
      title: "SQL & Analytics Fundamentals",
      description: "Evaluation on basic SQL queries, joins, aggregation, and funnel metrics.",
      courseId: analyticsCourse?.id,
      totalMarks: 15,
      passingMarks: 10,
      dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      status: "DRAFT",
      questions: [
        {
          question: "Which SQL keyword is used to filter records after aggregation?",
          type: "multiple_choice",
          marks: 15,
          explanation: "HAVING clause filters aggregated group results.",
          options: [
            { optionText: "WHERE", isCorrect: false },
            { optionText: "HAVING", isCorrect: true },
            { optionText: "GROUP BY", isCorrect: false },
            { optionText: "ORDER BY", isCorrect: false }
          ]
        }
      ]
    },
    {
      title: "AI Concepts & Prompting Quiz",
      description: "Covers prompt structure, token limits, zero-shot vs few-shot prompting.",
      courseId: aiCourse?.id,
      totalMarks: 25,
      passingMarks: 18,
      dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      status: "PUBLISHED",
      questions: [
        {
          question: "What is few-shot prompting?",
          type: "multiple_choice",
          marks: 25,
          explanation: "Few-shot prompting provides one or more examples in the prompt payload.",
          options: [
            { optionText: "Providing no examples in the prompt", isCorrect: false },
            { optionText: "Providing concrete input-output examples inside the prompt", isCorrect: true },
            { optionText: "Fine-tuning the model weights directly", isCorrect: false },
            { optionText: "Retrying the prompt multiple times automatically", isCorrect: false }
          ]
        }
      ]
    }
  ];

  for (const quizData of sampleQuizzes) {
    if (quizData.courseId) {
      const existingQuiz = await prisma.quiz.findFirst({
        where: { title: quizData.title, courseId: quizData.courseId }
      });

      if (!existingQuiz) {
        const { questions, ...quizFields } = quizData;
        const createdQuiz = await prisma.quiz.create({
          data: quizFields
        });

        for (let qIdx = 0; qIdx < questions.length; qIdx++) {
          const q = questions[qIdx];
          await prisma.quizQuestion.create({
            data: {
              quizId: createdQuiz.id,
              question: q.question,
              type: q.type,
              marks: q.marks,
              explanation: q.explanation,
              orderIndex: qIdx,
              options: {
                create: q.options.map((opt, oIdx) => ({
                  optionText: opt.optionText,
                  isCorrect: opt.isCorrect,
                  orderIndex: oIdx
                }))
              }
            }
          });
        }
      }
    }
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
