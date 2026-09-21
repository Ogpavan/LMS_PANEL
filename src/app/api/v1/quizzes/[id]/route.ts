import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { prisma } from "@/server/prisma";

interface OptionPayload {
  id?: number;
  optionText: string;
  isCorrect?: boolean;
}

interface QuestionSyncPayload {
  id?: number;
  question: string;
  type?: string;
  marks?: number;
  explanation?: string;
  options: OptionPayload[];
}

interface UpdateQuizPayload {
  title?: string;
  description?: string;
  courseId?: number | string;
  totalMarks?: number | string;
  passingMarks?: number | string;
  dueDate?: string | null;
  status?: string;
  questions?: QuestionSyncPayload[];
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR", "STUDENT"], {
      requiredPermission: "academy.assessments.quizzes"
    });

    if ("error" in auth) {
      return auth.error;
    }

    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (!id) {
      return apiError("Invalid quiz id", 422);
    }

    await ensureDatabaseSetup();

    const result = await prisma.quiz.findUnique({
      where: { id },
      include: {
        course: {
          select: { id: true, title: true }
        },
        questions: {
          orderBy: { orderIndex: "asc" },
          include: {
            options: {
              orderBy: { orderIndex: "asc" }
            }
          }
        },
        _count: {
          select: { questions: true }
        }
      }
    });

    if (!result) {
      return apiError("Quiz not found", 404);
    }

    return apiResponse({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("GET /api/v1/quizzes/[id] error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to fetch quiz",
      500
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
      requiredPermission: "academy.assessments.quizzes"
    });

    if ("error" in auth) {
      return auth.error;
    }

    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (!id) {
      return apiError("Invalid quiz id", 422);
    }

    const payload = await readJson<UpdateQuizPayload>(request);

    await ensureDatabaseSetup();

    const existing = await prisma.quiz.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      return apiError("Quiz not found", 404);
    }

    const updateData: {
      title?: string;
      description?: string;
      courseId?: number;
      totalMarks?: number;
      passingMarks?: number;
      dueDate?: Date | null;
      status?: string;
    } = {};

    if (payload?.title !== undefined) {
      const title = payload.title.trim();
      if (!title) {
        return apiError("Quiz title cannot be empty", 422);
      }
      updateData.title = title;
    }

    if (payload?.description !== undefined) {
      updateData.description = payload.description.trim();
    }

    if (payload?.courseId !== undefined) {
      const courseId = Number(payload.courseId);
      if (!Number.isInteger(courseId) || courseId <= 0) {
        return apiError("Invalid course selected", 422);
      }

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true }
      });

      if (!course) {
        return apiError("Selected course does not exist", 404);
      }

      updateData.courseId = courseId;
    }

    if (payload?.passingMarks !== undefined) {
      const passingMarks = Number(payload.passingMarks);
      if (Number.isNaN(passingMarks) || passingMarks < 0) {
        return apiError("Passing marks must be a non-negative number", 422);
      }
      updateData.passingMarks = passingMarks;
    }

    if (payload?.dueDate !== undefined) {
      if (payload.dueDate === null || payload.dueDate === "") {
        updateData.dueDate = null;
      } else {
        const dueDate = new Date(payload.dueDate);
        if (Number.isNaN(dueDate.getTime())) {
          return apiError("Invalid due date", 422);
        }
        updateData.dueDate = dueDate;
      }
    }

    if (payload?.status !== undefined) {
      updateData.status = payload.status.toUpperCase() === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
    }

    // Process questions array if provided
    if (payload && Array.isArray(payload.questions)) {
      const keepIds = payload.questions
        .map((q) => Number(q.id))
        .filter((qId) => Number.isInteger(qId) && qId > 0);

      // Delete questions removed by user
      await prisma.quizQuestion.deleteMany({
        where: {
          quizId: id,
          ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {})
        }
      });

      let computedTotalMarks = 0;

      for (let idx = 0; idx < payload.questions.length; idx++) {
        const q = payload.questions[idx];
        const marks = q.marks !== undefined && Number(q.marks) > 0 ? Number(q.marks) : 1;
        computedTotalMarks += marks;

        const validOptions = (q.options || [])
          .filter((opt) => opt.optionText.trim())
          .map((opt, oIdx) => ({
            optionText: opt.optionText.trim(),
            isCorrect: Boolean(opt.isCorrect),
            orderIndex: oIdx
          }));

        if (q.id && Number(q.id) > 0) {
          const qId = Number(q.id);
          // Delete old options
          await prisma.quizQuestionOption.deleteMany({
            where: { questionId: qId }
          });

          // Update question
          await prisma.quizQuestion.update({
            where: { id: qId },
            data: {
              question: q.question.trim(),
              type: q.type || "multiple_choice",
              marks,
              explanation: q.explanation?.trim() || "",
              orderIndex: idx,
              options: {
                create: validOptions
              }
            }
          });
        } else {
          // Create new question
          await prisma.quizQuestion.create({
            data: {
              quizId: id,
              question: q.question.trim(),
              type: q.type || "multiple_choice",
              marks,
              explanation: q.explanation?.trim() || "",
              orderIndex: idx,
              options: {
                create: validOptions
              }
            }
          });
        }
      }

      updateData.totalMarks = computedTotalMarks;
    } else if (payload?.totalMarks !== undefined) {
      const totalMarks = Number(payload.totalMarks);
      if (Number.isNaN(totalMarks) || totalMarks < 0) {
        return apiError("Total marks must be a non-negative number", 422);
      }
      updateData.totalMarks = totalMarks;
    }

    const result = await prisma.quiz.update({
      where: { id },
      data: updateData,
      include: {
        course: {
          select: { id: true, title: true }
        },
        questions: {
          orderBy: { orderIndex: "asc" },
          include: {
            options: {
              orderBy: { orderIndex: "asc" }
            }
          }
        },
        _count: {
          select: { questions: true }
        }
      }
    });

    return apiResponse({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("PUT /api/v1/quizzes/[id] error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to update quiz",
      500
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
      requiredPermission: "academy.assessments.quizzes"
    });

    if ("error" in auth) {
      return auth.error;
    }

    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (!id) {
      return apiError("Invalid quiz id", 422);
    }

    await ensureDatabaseSetup();

    const existing = await prisma.quiz.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      return apiError("Quiz not found", 404);
    }

    await prisma.quiz.delete({
      where: { id }
    });

    return apiResponse({
      success: true
    });
  } catch (err) {
    console.error("DELETE /api/v1/quizzes/[id] error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to delete quiz",
      500
    );
  }
}

export const OPTIONS = handleOptions;
