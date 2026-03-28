import { BadRequestError, NotFoundError } from "../../errors/request/apiError";
import Question from "../question/question.model";
import { IQuizTemplate } from "./quiz.interface";
import QuizTemplate from "./quiz.model";


interface SubjectFilter {
  subjectId: string;
  questionCount: number;
}

interface CreateQuizTemplatePayload {
  title: string;
  examType: "semi_matura" | "matura" | "provime";
  year: number;
  type: "full_simulation" | "practice";
  subjectFilters: SubjectFilter[];
  electiveQuestionCount?: number;
  durationMinutes?: number;
  access: "free" | "premium";
}

interface GetTemplatesFilter {
  examType?: string;
  year?: number;
  type?: string;
  access?: string;
  status?: string;
}

// ─── Validate enough questions exist ─────────────────────────
const validateQuestionAvailability = async (
  examType: string,
  year: number,
  subjectFilters: SubjectFilter[]
) => {
  const results = await Promise.all(
    subjectFilters.map(async (filter) => {
      const count = await Question.countDocuments({
        examType,
        year,
        subjectId: filter.subjectId,
        source: { $in: ["practice", "both"] },
        status: "published",
        isActive: true,
      });

      return {
        subjectId: filter.subjectId,
        required: filter.questionCount,
        available: count,
        isEnough: count >= filter.questionCount,
      };
    })
  );

  const notEnough = results.filter((r) => !r.isEnough);
  if (notEnough.length > 0) {
    throw new BadRequestError(
      `Not enough published questions for ${notEnough.length} subject(s). Check subject availability.`
    );
  }

  return results;
};

// ─── Create ───────────────────────────────────────────────────
const createQuizTemplate = async (
  payload: CreateQuizTemplatePayload
): Promise<IQuizTemplate> => {
  // validate questions available
  await validateQuestionAvailability(
    payload.examType,
    payload.year,
    payload.subjectFilters
  );

  const totalFromSubjects = payload.subjectFilters.reduce(
    (sum, f) => sum + f.questionCount,
    0
  );
  const electiveCount = payload.electiveQuestionCount ?? 0;
  const totalQuestions = totalFromSubjects + electiveCount;

  const template = await QuizTemplate.create({
    ...payload,
    totalQuestions,
    electiveQuestionCount: electiveCount,
    status: "draft",
  });

  return template;
};

// ─── Get All ──────────────────────────────────────────────────
const getAllTemplates = async (
  filter: GetTemplatesFilter
): Promise<IQuizTemplate[]> => {
  const query: Record<string, unknown> = { isActive: true };
  if (filter.examType) query.examType = filter.examType;
  if (filter.year) query.year = Number(filter.year);
  if (filter.type) query.type = filter.type;
  if (filter.access) query.access = filter.access;
  if (filter.status) query.status = filter.status;

  return QuizTemplate.find(query)
    .populate("subjectFilters.subjectId", "name slug isElective")
    .sort({ year: -1 });
};

// ─── Get By Id ────────────────────────────────────────────────
const getTemplateById = async (id: string): Promise<IQuizTemplate> => {
  const template = await QuizTemplate.findById(id).populate(
    "subjectFilters.subjectId",
    "name slug isElective"
  );
  if (!template || !template.isActive) {
    throw new NotFoundError("Quiz template not found");
  }
  return template;
};

// ─── Generate Quiz (student use) ──────────────────────────────
// const generateQuiz = async (templateId: string, userId: string) => {
//   const template = await QuizTemplate.findById(templateId);
//   if (!template || !template.isActive || template.status !== "published") {
//     throw new NotFoundError("Quiz template not found");
//   }

//   // core subjects থেকে questions
//   const coreQuestionsArrays = await Promise.all(
//     template.subjectFilters.map((filter) =>
//       Question.find({
//         examType: template.examType,
//         year: template.year,
//         subjectId: filter.subjectId,
//         source: { $in: ["practice", "both"] },
//         status: "published",
//         isActive: true,
//       })
//         .limit(filter.questionCount)
//         .populate("passageId", "passageCode title content")
//     )
//   );

//   let electiveQuestions: unknown[] = [];

//   // elective — শুধু Matura plan এর জন্য
//   if (template.electiveQuestionCount > 0) {
//     const subscription = await Subscription.findOne({
//       userId,
//       status: "active",
//       expiryDate: { $gt: new Date() },
//     }).populate("planId");

//     if (!subscription) {
//       throw new BadRequestError("No active subscription found");
//     }

//     const plan = (subscription.planId as { slug: string }).slug;
//     const hasMatura = plan === "matura" || plan === "full_access";

//     if (hasMatura && subscription.electiveSubjectId) {
//       electiveQuestions = await Question.find({
//         subjectId: subscription.electiveSubjectId,
//         examType: template.examType,
//         year: template.year,
//         source: { $in: ["practice", "both"] },
//         status: "published",
//         isActive: true,
//       })
//         .limit(template.electiveQuestionCount)
//         .populate("passageId", "passageCode title content");
//     }
//   }

//   const allQuestions = [...coreQuestionsArrays.flat(), ...electiveQuestions];

//   return {
//     templateId: template._id,
//     title: template.title,
//     examType: template.examType,
//     year: template.year,
//     durationMinutes: template.durationMinutes,
//     totalQuestions: allQuestions.length,
//     questions: allQuestions,
//   };
// };

// ─── Publish ──────────────────────────────────────────────────
const publishTemplate = async (id: string): Promise<IQuizTemplate> => {
  const template = await QuizTemplate.findById(id);
  if (!template || !template.isActive) {
    throw new NotFoundError("Quiz template not found");
  }

  // publish করার আগে আবার validate
  await validateQuestionAvailability(
    template.examType,
    template.year,
    template.subjectFilters.map((f) => ({
      subjectId: f.subjectId.toString(),
      questionCount: f.questionCount,
    }))
  );

  template.status = "published";
  await template.save();
  return template;
};

// ─── Update ───────────────────────────────────────────────────
const updateTemplate = async (
  id: string,
  payload: Partial<CreateQuizTemplatePayload>
): Promise<IQuizTemplate> => {
  const template = await QuizTemplate.findById(id);
  if (!template || !template.isActive) {
    throw new NotFoundError("Quiz template not found");
  }

  if (template.status === "published") {
    throw new BadRequestError("Cannot edit a published template");
  }

  // recalculate total if subjectFilters changed
  if (payload.subjectFilters) {
    await validateQuestionAvailability(
      payload.examType ?? template.examType,
      payload.year ?? template.year,
      payload.subjectFilters
    );

    const totalFromSubjects = payload.subjectFilters.reduce(
      (sum, f) => sum + f.questionCount,
      0
    );
    const electiveCount =
      payload.electiveQuestionCount ?? template.electiveQuestionCount;
    payload.electiveQuestionCount = electiveCount;
    Object.assign(payload, {
      totalQuestions: totalFromSubjects + electiveCount,
    });
  }

  Object.assign(template, payload);
  await template.save();
  return template;
};

// ─── Delete ───────────────────────────────────────────────────
const deleteTemplate = async (id: string): Promise<void> => {
  const template = await QuizTemplate.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
  if (!template) throw new NotFoundError("Quiz template not found");
};

export const quizTemplateService = {
  createQuizTemplate,
  getAllTemplates,
  getTemplateById,
  // generateQuiz,
  publishTemplate,
  updateTemplate,
  deleteTemplate,
};