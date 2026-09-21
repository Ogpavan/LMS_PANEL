import { prisma } from "@/server/prisma";
import { getValidGoogleAccessToken } from "@/server/google/oauth";

export class GoogleIntegrationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "GoogleIntegrationError";
    this.statusCode = statusCode;
  }
}

export async function createOrSyncGoogleQuiz(quizId: number, userId: number) {
  let accessToken: string;
  try {
    accessToken = await getValidGoogleAccessToken(userId);
  } catch (err) {
    throw new GoogleIntegrationError(
      err instanceof Error ? err.message : "Google account is not connected. Please connect Google before creating a Google Quiz.",
      401
    );
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      course: { select: { id: true, title: true } },
      questions: {
        orderBy: { orderIndex: "asc" },
        include: {
          options: {
            orderBy: { orderIndex: "asc" }
          }
        }
      }
    }
  });

  if (!quiz) {
    throw new GoogleIntegrationError(`Quiz with ID ${quizId} not found`, 404);
  }

  if (!quiz.title || !quiz.title.trim()) {
    throw new GoogleIntegrationError(`Quiz #${quizId} is missing a title.`, 400);
  }

  if (!quiz.questions || quiz.questions.length === 0) {
    throw new GoogleIntegrationError(
      "Quiz has no questions. Please add at least one question before creating a Google Quiz.",
      400
    );
  }

  // Validate each question and options
  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i];
    if (!q.question || !q.question.trim()) {
      throw new GoogleIntegrationError(`Question ${i + 1} does not have valid question text.`, 400);
    }
    const validOptions = (q.options || []).filter((opt) => opt.optionText && opt.optionText.trim());
    if (validOptions.length < 2) {
      throw new GoogleIntegrationError(
        `Question ${i + 1} ("${q.question}") must have at least 2 valid options.`,
        400
      );
    }
    const hasCorrect = validOptions.some((opt) => opt.isCorrect);
    if (!hasCorrect) {
      throw new GoogleIntegrationError(
        `Question ${i + 1} ("${q.question}") must have a correct answer selected.`,
        400
      );
    }
    if (q.marks !== undefined && Number(q.marks) < 1) {
      throw new GoogleIntegrationError(
        `Question ${i + 1} ("${q.question}") marks must be at least 1.`,
        400
      );
    }
  }

  let formId = quiz.googleFormId;
  let formUrl = quiz.googleFormUrl;
  let responderUri = quiz.googleResponderUri;
  let isNewForm = false;

  if (formId) {
    // Check if existing form exists in Google Drive
    try {
      const checkRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!checkRes.ok) {
        if (checkRes.status === 404) {
          formId = null;
        } else if (checkRes.status === 401 || checkRes.status === 403) {
          const errData = await checkRes.json().catch(() => ({}));
          console.error("[Google Quiz Creation Error] Google auth failed checking form:", {
            status: checkRes.status,
            error: errData.error
          });
          throw new GoogleIntegrationError(
            "Google authorization expired. Please reconnect your Google account.",
            401
          );
        }
      }
    } catch (err) {
      if (err instanceof GoogleIntegrationError) throw err;
      // Network check fallback
    }
  }

  if (!formId) {
    isNewForm = true;
    // 1. Create a new Google Form
    const createRes = await fetch("https://forms.googleapis.com/v1/forms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        info: {
          title: quiz.title,
          documentTitle: quiz.title
        }
      })
    });

    const createData = await createRes.json();

    if (!createRes.ok || !createData.formId) {
      console.error("[Google Quiz Creation Error] Google Forms API creation failed:", {
        status: createRes.status,
        error: createData.error
      });
      const isAuthError = createRes.status === 401 || createRes.status === 403;
      throw new GoogleIntegrationError(
        createData.error?.message || "Failed to create Google Form",
        isAuthError ? 401 : 400
      );
    }

    formId = createData.formId as string;
    responderUri = (createData.responderUri as string) || `https://docs.google.com/forms/d/e/${formId}/viewform`;
    formUrl = `https://docs.google.com/forms/d/${formId}/edit`;
  }

  // Clear existing items if updating an existing form to prevent duplicate question items
  if (!isNewForm) {
    try {
      const formInfoRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (formInfoRes.ok) {
        const formInfo = await formInfoRes.json();
        if (Array.isArray(formInfo.items) && formInfo.items.length > 0) {
          const deleteRequests = formInfo.items.map(() => ({
            deleteItem: { location: { index: 0 } }
          }));
          await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ requests: deleteRequests })
          });
        }
      }
    } catch {
      // Ignore cleanup error if items fail to delete
    }
  }

  // 2. Convert Google Form to Quiz and add questions/options
  const batchRequests: unknown[] = [
    {
      updateFormInfo: {
        info: {
          title: quiz.title,
          description: quiz.description || undefined
        },
        updateMask: "title,description"
      }
    },
    {
      updateSettings: {
        settings: {
          quizSettings: {
            isQuiz: true
          }
        },
        updateMask: "quizSettings.isQuiz"
      }
    }
  ];

  // Build question requests
  quiz.questions.forEach((q, index) => {
    const validOpts = q.options.filter((o) => o.optionText.trim());
    const correctOption = validOpts.find((o) => o.isCorrect);
    const correctValue = correctOption ? correctOption.optionText.trim() : validOpts[0]?.optionText.trim() || "";

    batchRequests.push({
      createItem: {
        item: {
          title: `Question ${index + 1}: ${q.question.trim()}`,
          description: q.explanation || undefined,
          questionItem: {
            question: {
              required: true,
              grading: {
                pointValue: Number(q.marks) || 1,
                correctAnswers: {
                  answers: [{ value: correctValue }]
                }
              },
              choiceQuestion: {
                type: q.type === "checkbox" ? "CHECKBOX" : "RADIO",
                options: validOpts.map((opt) => ({
                  value: opt.optionText.trim()
                }))
              }
            }
          }
        },
        location: { index }
      }
    });
  });

  const batchRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requests: batchRequests
    })
  });

  const batchData = await batchRes.json();

  if (!batchRes.ok || batchData.error) {
    console.error("[Google Quiz Creation Error] Google Forms batchUpdate failed:", {
      status: batchRes.status,
      error: batchData.error
    });

    await prisma.quiz.update({
      where: { id: quizId },
      data: {
        googleFormId: formId,
        googleFormUrl: formUrl,
        googleResponderUri: responderUri,
        googleIntegrationStatus: "ERROR"
      }
    });

    const isAuthError = batchRes.status === 401 || batchRes.status === 403;
    throw new GoogleIntegrationError(
      batchData.error?.message || "Failed to sync questions to Google Form Quiz",
      isAuthError ? 401 : 400
    );
  }

  // Extract googleItemId from replies and save onto QuizQuestion records
  if (Array.isArray(batchData.replies)) {
    // Reply 0: updateFormInfo, Reply 1: updateSettings. Replies 2..N: createItem for questions
    const itemReplies = batchData.replies.slice(2);
    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      const reply = itemReplies[i];
      const googleItemId = reply?.createItem?.itemId || null;

      if (googleItemId && q.id) {
        await prisma.quizQuestion.update({
          where: { id: q.id },
          data: { googleItemId }
        });
      }
    }
  }

  // Save updated Google Form credentials on LMS Quiz
  const updatedQuiz = await prisma.quiz.update({
    where: { id: quizId },
    data: {
      googleFormId: formId,
      googleFormUrl: formUrl,
      googleResponderUri: responderUri,
      googleIntegrationStatus: "SYNCED",
      googleLastSyncedAt: new Date()
    },
    include: {
      course: { select: { id: true, title: true } },
      _count: { select: { questions: true } }
    }
  });

  return updatedQuiz;
}

export async function syncGoogleQuizResponses(quizId: number, userId: number) {
  let accessToken: string;
  try {
    accessToken = await getValidGoogleAccessToken(userId);
  } catch (err) {
    throw new GoogleIntegrationError(
      err instanceof Error ? err.message : "Google account is not connected. Please connect Google account.",
      401
    );
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: {
          options: true
        }
      }
    }
  });

  if (!quiz) {
    throw new GoogleIntegrationError("LMS Quiz not found", 404);
  }

  if (!quiz.googleFormId) {
    throw new GoogleIntegrationError("Google Quiz has not been created yet for this LMS Quiz", 400);
  }

  // Call Google Forms API responses endpoint
  const responseRes = await fetch(
    `https://forms.googleapis.com/v1/forms/${quiz.googleFormId}/responses`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  const responseData = await responseRes.json();

  if (!responseRes.ok || responseData.error) {
    const isAuthError = responseRes.status === 401 || responseRes.status === 403;
    throw new GoogleIntegrationError(
      responseData.error?.message || "Failed to fetch responses from Google Forms API",
      isAuthError ? 401 : 400
    );
  }

  const responses = Array.isArray(responseData.responses) ? responseData.responses : [];

  let synced = 0;
  let created = 0;
  let updated = 0;
  let failed = 0;
  let unmatched = 0;

  for (const resp of responses) {
    try {
      const googleResponseId = resp.responseId as string;
      const submittedAt = resp.createTime ? new Date(resp.createTime) : new Date();
      const respondentEmail = (resp.respondentEmail as string || "").trim().toLowerCase();

      // Find matching LMS student by email if available
      let studentId: number | null = null;
      let studentName = "";

      if (respondentEmail) {
        const student = await prisma.student.findUnique({
          where: { email: respondentEmail }
        });

        if (student) {
          studentId = student.id;
          studentName = student.name;
        } else {
          unmatched++;
        }
      } else {
        unmatched++;
      }

      // Calculate score and total marks
      const totalScore = typeof resp.totalScore === "number" ? resp.totalScore : 0;
      const totalMarks = quiz.totalMarks || 100;
      const percentage = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;
      const passed = totalScore >= quiz.passingMarks;
      const status = studentId ? "COMPLETED" : "UNMATCHED";

      // Check if attempt already exists (IDEMPOTENCY)
      const existingAttempt = await prisma.quizAttempt.findUnique({
        where: { googleResponseId }
      });

      let attemptId: number;

      if (existingAttempt) {
        const updatedAttempt = await prisma.quizAttempt.update({
          where: { googleResponseId },
          data: {
            score: totalScore,
            totalMarks,
            percentage,
            passed,
            status,
            studentId,
            studentEmail: respondentEmail || existingAttempt.studentEmail || "unmatched@google.form",
            studentName: studentName || existingAttempt.studentName || "Unmatched Student",
            syncedAt: new Date()
          }
        });
        attemptId = updatedAttempt.id;
        updated++;
      } else {
        const newAttempt = await prisma.quizAttempt.create({
          data: {
            quizId,
            studentId,
            studentEmail: respondentEmail || "unmatched@google.form",
            studentName: studentName || "Unmatched Student",
            googleResponseId,
            score: totalScore,
            totalMarks,
            percentage,
            passed,
            status,
            source: "GOOGLE_FORMS",
            submittedAt,
            syncedAt: new Date()
          }
        });
        attemptId = newAttempt.id;
        created++;
      }

      // Process per-question answers if provided by Google Forms API
      if (resp.answers && typeof resp.answers === "object") {
        for (const itemId of Object.keys(resp.answers)) {
          const itemAns = resp.answers[itemId];
          const textValues = itemAns?.textAnswers?.answers?.map((a: { value?: string }) => a.value).filter(Boolean) || [];
          const selectedAnswer = textValues.join(", ");
          const marksAwarded = typeof itemAns?.grade?.score === "number" ? itemAns.grade.score : 0;

          // Find LMS question matching googleItemId or fallback
          const lmsQuestion = quiz.questions.find((q) => q.googleItemId === itemId);

          // Clear existing answer if updating
          if (existingAttempt) {
            await prisma.quizAttemptAnswer.deleteMany({
              where: { attemptId, googleItemId: itemId }
            });
          }

          await prisma.quizAttemptAnswer.create({
            data: {
              attemptId,
              questionId: lmsQuestion?.id || null,
              googleItemId: itemId,
              selectedAnswer,
              marksAwarded
            }
          });
        }
      }

      synced++;
    } catch (err) {
      console.error("Error processing Google Form response:", err);
      failed++;
    }
  }

  // Update last synced timestamp on Quiz
  await prisma.quiz.update({
    where: { id: quizId },
    data: {
      googleLastSyncedAt: new Date(),
      googleIntegrationStatus: "SYNCED"
    }
  });

  return {
    synced,
    created,
    updated,
    failed,
    unmatched,
    totalResponses: responses.length
  };
}

export async function getQuizAttempts(quizId: number) {
  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId },
    include: {
      student: { select: { id: true, name: true, email: true } },
      answers: {
        include: {
          question: { select: { id: true, question: true, marks: true } }
        }
      }
    },
    orderBy: { submittedAt: "desc" }
  });

  return attempts;
}
