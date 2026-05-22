export interface CoursePayloadInput {
  title?: string;
  slug?: string;
  category?: string;
  instructor?: string;
  shortDescription?: string;
  description?: string;
  thumbnailUrl?: string;
  price?: number;
  currency?: string;
  level?: string;
  durationLabel?: string;
  language?: string;
  contentMode?: string;
  status?: string;
  visibility?: string;
  featured?: boolean;
  sections?: CourseSectionPayloadInput[];
}

export interface CourseLessonPayloadInput {
  title?: string;
  summary?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationLabel?: string;
}

export interface CourseSectionPayloadInput {
  title?: string;
  dayLabel?: string;
  lessons?: CourseLessonPayloadInput[];
}

export function createCourseSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function createCategorySlug(value: string) {
  return createCourseSlug(value);
}

export function normalizeCoursePayload(payload: CoursePayloadInput) {
  const title = payload.title?.trim() ?? "";
  const slug = createCourseSlug(payload.slug?.trim() || title);
  const category = payload.category?.trim() ?? "";
  const instructor = payload.instructor?.trim() ?? "";
  const shortDescription = payload.shortDescription?.trim() ?? "";
  const description = payload.description?.trim() ?? "";
  const thumbnailUrl = payload.thumbnailUrl?.trim() ?? "";
  const price = Number.isFinite(payload.price) ? Number(payload.price) : 0;
  const currency = payload.currency?.trim() || "INR";
  const level = payload.level?.trim() || "beginner";
  const durationLabel = payload.durationLabel?.trim() ?? "";
  const language = payload.language?.trim() || "English";
  const contentMode = payload.contentMode?.trim() || "topic";
  const status = payload.status?.trim() || "draft";
  const visibility = payload.visibility?.trim() || "public";
  const featured = Boolean(payload.featured);
  const sections = (payload.sections ?? [])
    .map((section, sectionIndex) => {
      const title = section.title?.trim() ?? "";
      const dayLabel = section.dayLabel?.trim() ?? "";
      const lessons = (section.lessons ?? [])
        .map((lesson, lessonIndex) => ({
          title: lesson.title?.trim() ?? "",
          summary: lesson.summary?.trim() ?? "",
          videoUrl: lesson.videoUrl?.trim() ?? "",
          thumbnailUrl: lesson.thumbnailUrl?.trim() || thumbnailUrl,
          durationLabel: lesson.durationLabel?.trim() ?? "",
          orderIndex: lessonIndex
        }))
        .filter((lesson) => lesson.title);

      return {
        title,
        dayLabel,
        orderIndex: sectionIndex,
        lessons
      };
    })
    .filter((section) => section.title);

  return {
    title,
    slug,
    category,
    instructor,
    shortDescription,
    description,
    thumbnailUrl,
    price,
    currency,
    level,
    durationLabel,
    language,
    contentMode,
    status,
    visibility,
    featured,
    sections
  };
}

export interface CourseCategoryPayloadInput {
  name?: string;
  slug?: string;
  description?: string;
  status?: string;
}

export function normalizeCourseCategoryPayload(payload: CourseCategoryPayloadInput) {
  const name = payload.name?.trim() ?? "";
  const slug = createCategorySlug(payload.slug?.trim() || name);
  const description = payload.description?.trim() ?? "";
  const status = payload.status?.trim() || "active";

  return {
    name,
    slug,
    description,
    status
  };
}
