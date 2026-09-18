import { authorizeRequest } from "@/server/auth";
import { ensureDatabaseSetup } from "@/server/bootstrap";
import { apiError, apiResponse, handleOptions, readJson } from "@/server/api";
import { prisma } from "@/server/prisma";

interface OptionPayload {
  id?: number;
  optionText: string;
  isCorrect?: boolean;
}

interface QuestionPayload {
  questionId?: number;
  question?: string;
  type?: string;
  marks?: number;
  explanation?: string;
  options?: OptionPayload[];
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/v1/quizzes/[id]/questions
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
    const quizId = parseId(rawId);

    if (!quizId) {
      return apiError("Invalid quiz id", 422);
    }

    await ensureDatabaseSetup();

    const questions = await prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { orderIndex: "asc" },
      include: {
        options: {
          orderBy: { orderIndex: "asc" }
        }
      }
    });

    return apiResponse({
      success: true,
      data: questions
    });
  } catch (err) {
    console.error("GET /api/v1/quizzes/[id]/questions error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to fetch quiz questions",
      500
    );
  }
}

// POST /api/v1/quizzes/[id]/questions
export async function POST(
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
    const quizId = parseId(rawId);

    if (!quizId) {
      return apiError("Invalid quiz id", 422);
    }

    const payload = await readJson<QuestionPayload>(request);

    if (!payload?.question?.trim()) {
      return apiError("Question text is required", 422);
    }

    await ensureDatabaseSetup();

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true, totalMarks: true }
    });

    if (!quiz) {
      return apiError("Quiz not found", 404);
    }

    const marks = payload.marks !== undefined && Number(payload.marks) > 0 ? Number(payload.marks) : 1;
    const questionText = payload.question.trim();
    const type = payload.type || "multiple_choice";
    const explanation = payload.explanation?.trim() || "";

    // Count existing questions to set orderIndex
    const questionCount = await prisma.quizQuestion.count({
      where: { quizId }
    });

    const newQuestion = await prisma.quizQuestion.create({
      data: {
        quizId,
        question: questionText,
        type,
        marks,
        explanation,
        orderIndex: questionCount,
        options: {
          create: (payload.options || []).map((opt, idx) => ({
            optionText: opt.optionText.trim(),
            isCorrect: Boolean(opt.isCorrect),
            orderIndex: idx
          }))
        }
      },
      include: {
        options: {
          orderBy: { orderIndex: "asc" }
        }
      }
    });

    // Recalculate total marks for the quiz
    const allQuestions = await prisma.quizQuestion.findMany({
      where: { quizId },
      select: { marks: true }
    });
    const updatedTotalMarks = allQuestions.reduce((sum, q) => sum + q.marks, 0);

    await prisma.quiz.update({
      where: { id: quizId },
      data: { totalMarks: updatedTotalMarks }
    });

    return apiResponse(
      {
        success: true,
        data: newQuestion
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/v1/quizzes/[id]/questions error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to create quiz question",
      500
    );
  }
}

// PUT /api/v1/quizzes/[id]/questions
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
    const quizId = parseId(rawId);

    if (!quizId) {
      return apiError("Invalid quiz id", 422);
    }

    const payload = await readJson<QuestionPayload>(request);

    if (!payload?.questionId) {
      return apiError("Question ID is required for update", 422);
    }

    const questionId = Number(payload.questionId);
    if (!Number.isInteger(questionId) || questionId <= 0) {
      return apiError("Invalid question ID", 422);
    }

    await ensureDatabaseSetup();

    const existingQuestion = await prisma.quizQuestion.findFirst({
      where: { id: questionId, quizId }
    });

    if (!existingQuestion) {
      return apiError("Question not found for this quiz", 404);
    }

    const marks = payload.marks !== undefined && Number(payload.marks) >= 0 ? Number(payload.marks) : existingQuestion.marks;
    const questionText = payload.question !== undefined ? payload.question.trim() : existingQuestion.question;
    const type = payload.type || existingQuestion.type;
    const explanation = payload.explanation !== undefined ? payload.explanation.trim() : existingQuestion.explanation;

    // Delete existing options and create updated options if provided
    if (payload.options) {
      await prisma.quizQuestionOption.deleteMany({
        where: { questionId }
      });
    }

    const updatedQuestion = await prisma.quizQuestion.update({
      where: { id: questionId },
      data: {
        question: questionText,
        type,
        marks,
        explanation,
        ...(payload.options
          ? {
              options: {
                create: payload.options.map((opt, idx) => ({
                  optionText: opt.optionText.trim(),
                  isCorrect: Boolean(opt.isCorrect),
                  orderIndex: idx
                }))
              }
            }
          : {})
      },
      include: {
        options: {
          orderBy: { orderIndex: "asc" }
        }
      }
    });

    // Recalculate total marks for the quiz
    const allQuestions = await prisma.quizQuestion.findMany({
      where: { quizId },
      select: { marks: true }
    });
    const updatedTotalMarks = allQuestions.reduce((sum, q) => sum + q.marks, 0);

    await prisma.quiz.update({
      where: { id: quizId },
      data: { totalMarks: updatedTotalMarks }
    });

    return apiResponse({
      success: true,
      data: updatedQuestion
    });
  } catch (err) {
    console.error("PUT /api/v1/quizzes/[id]/questions error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to update quiz question",
      500
    );
  }
}

// DELETE /api/v1/quizzes/[id]/questions
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
    const quizId = parseId(rawId);

    if (!quizId) {
      return apiError("Invalid quiz id", 422);
    }

    const { searchParams } = new URL(request.url);
    const questionIdParam = searchParams.get("questionId");

    if (!questionIdParam) {
      return apiError("Question ID parameter (questionId) is required", 422);
    }

    const questionId = Number(questionIdParam);
    if (!Number.isInteger(questionId) || questionId <= 0) {
      return apiError("Invalid question ID", 422);
    }

    await ensureDatabaseSetup();

    const existingQuestion = await prisma.quizQuestion.findFirst({
      where: { id: questionId, quizId }
    });

    if (!existingQuestion) {
      return apiError("Question not found for this quiz", 404);
    }

    await prisma.quizQuestion.delete({
      where: { id: questionId }
    });

    // Recalculate total marks for the quiz
    const allQuestions = await prisma.quizQuestion.findMany({
      where: { quizId },
      select: { marks: true }
    });
    const updatedTotalMarks = allQuestions.reduce((sum, q) => sum + q.marks, 0);

    await prisma.quiz.update({
      where: { id: quizId },
      data: { totalMarks: updatedTotalMarks }
    });

    return apiResponse({
      success: true
    });
  } catch (err) {
    console.error("DELETE /api/v1/quizzes/[id]/questions error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to delete quiz question",
      500
    );
  }
}

export const OPTIONS = handleOptions;
