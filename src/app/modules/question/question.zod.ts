import { z } from "zod";

// ─── Passage ──────────────────────────────────────────────────

const createPassageSchema = z.object({
  passage_code: z.string({ message: "Passage code is required" }).min(1, {
    message: "Passage code cannot be empty",
  }),
  title: z.string({ message: "Title is required" }).min(1, {
    message: "Title cannot be empty",
  }),
  content: z.string({ message: "Content is required" }).min(1, {
    message: "Content cannot be empty",
  }),
  exam_type: z.enum(["semi_matura", "matura", "provime"], {
    message: "Exam type must be semi_matura, matura or provime",
  }),
  year: z
    .number({ message: "Year is required" })
    .int({ message: "Year must be an integer" })
    .min(2000, { message: "Year must be 2000 or later" })
    .max(new Date().getFullYear(), { message: "Year cannot be in the future" }),
  subject_id: z.string({ message: "Subject ID must be a string" }).optional(),
});

const updatePassageSchema = z.object({
  passage_code: z.string({ message: "Passage code must be a string" }).min(1, {
    message: "Passage code cannot be empty",
  }).optional(),
  title: z.string({ message: "Title must be a string" }).min(1, {
    message: "Title cannot be empty",
  }).optional(),
  content: z.string({ message: "Content must be a string" }).min(1, {
    message: "Content cannot be empty",
  }).optional(),
  exam_type: z.enum(["semi_matura", "matura", "provime"], {
    message: "Exam type must be semi_matura, matura or provime",
  }).optional(),
  year: z
    .number({ message: "Year must be a number" })
    .int({ message: "Year must be an integer" })
    .min(2000, { message: "Year must be 2000 or later" })
    .max(new Date().getFullYear(), { message: "Year cannot be in the future" })
    .optional(),
  subject_id: z.string({ message: "Subject ID must be a string" }).optional(),
});

// ─── Question ─────────────────────────────────────────────────

const optionSchema = z.object({
  text: z.string({ message: "Option text is required" }).min(1, {
    message: "Option text cannot be empty",
  }),
  imageUrl: z
    .url({ message: "Invalid image URL" })
    .optional(),
});

// create question schema
const createQuestionSchema = z
  .object({
    examType: z.enum(["semi_matura", "matura", "provime"], {
      message: "Exam type must be semi_matura, matura or provime",
    }),
    year: z
      .number({ message: "Year is required" })
      .int({ message: "Year must be an integer" })
      .min(2000, { message: "Year must be 2000 or later" })
      .max(new Date().getFullYear(), { message: "Year cannot be in the future" }),
    subjectId: z.string({ message: "Subject ID must be a string" }).optional(),
    facultyId: z.string({ message: "Faculty ID must be a string" }).optional(),
    departmentId: z.string({ message: "Department ID must be a string" }).optional(),
    passageId: z.string({ message: "Passage ID must be a string" }).optional(),
    source: z.enum(["archive", "practice", "both"], {
      message: "Source must be archive, practice or both",
    }).default("both"),
    testType: z.enum(["official", "additional"], {
      message: "Test type must be official or additional",
    }),
    access: z.enum(["free", "premium"], {
      message: "Access must be free or premium",
    }),
    questionText: z.string({ message: "Question text is required" }).min(1, {
      message: "Question text cannot be empty",
    }),
    questionImageUrl: z
      .url({ message: "Invalid image URL" })
      .optional(),
    options: z
      .array(optionSchema, { message: "Options must be an array" })
      .min(2, { message: "At least 2 options are required" })
      .max(4, { message: "Maximum 4 options allowed" }),
    correctOptionIndex: z
      .number({ message: "Correct option index is required" })
      .int({ message: "Correct option index must be an integer" })
      .min(0, { message: "Correct option index must be 0 or greater" }),
    explanation: z.string({ message: "Explanation must be a string" }).optional(),
    status: z.enum(["draft", "published"], {
      message: "Status must be draft or published",
    }).default("draft"),
  })
  .refine((data) => data.correctOptionIndex < data.options.length, {
    message: "correctOptionIndex is out of range",
    path: ["correctOptionIndex"],
  }).superRefine((data, ctx) => {
    if (data.examType === "provime") {
      if (!data.facultyId) {
        ctx.addIssue({
          code: 'custom',
          maximum: 1,
          origin: 'superRefine',
          inclusive: true,
          path: ['error'],
          message: "Faculty ID is required when exam type is provime",
        });
      }
      if (!data.departmentId) {
        ctx.addIssue({
          code: 'custom',
          maximum: 1,
          origin: 'superRefine',
          inclusive: true,
          path: ['error'],
          message: "Department ID is required when exam type is provime",
        });
      }
    }
  });

const updateQuestionSchema = z
  .object({
    examType: z.enum(["semi_matura", "matura", "provime"], {
      message: "Exam type must be semi_matura, matura or provime",
    }).optional(),
    year: z
      .number({ message: "Year must be a number" })
      .int({ message: "Year must be an integer" })
      .min(2000, { message: "Year must be 2000 or later" })
      .max(new Date().getFullYear(), { message: "Year cannot be in the future" })
      .optional(),
    subjectId: z.string({ message: "Subject ID must be a string" }).optional(),
    facultyId: z.string({ message: "Faculty ID must be a string" }).optional(),
    departmentId: z.string({ message: "Department ID must be a string" }).optional(),
    passageId: z.string({ message: "Passage ID must be a string" }).optional(),
    source: z.enum(["archive", "practice", "both"], {
      message: "Source must be archive, practice or both",
    }).optional(),
    testType: z.enum(["official", "additional"], {
      message: "Test type must be official or additional",
    }).optional(),
    access: z.enum(["free", "premium"], {
      message: "Access must be free or premium",
    }).optional(),
    questionText: z.string({ message: "Question text must be a string" }).min(1, {
      message: "Question text cannot be empty",
    }).optional(),
    questionImageUrl: z
      .url({ message: "Invalid image URL" })
      .optional(),
    options: z
      .array(optionSchema, { message: "Options must be an array" })
      .min(2, { message: "At least 2 options are required" })
      .max(4, { message: "Maximum 4 options allowed" })
      .optional(),
    correctOptionIndex: z
      .number({ message: "Correct option index must be a number" })
      .int({ message: "Correct option index must be an integer" })
      .min(0, { message: "Correct option index must be 0 or greater" })
      .optional(),
    explanation: z.string({ message: "Explanation must be a string" }).optional(),
    status: z.enum(["draft", "published"], {
      message: "Status must be draft or published",
    }).optional(),
  })
  .refine(
    (data) => {
      if (data.correctOptionIndex !== undefined && data.options !== undefined) {
        return data.correctOptionIndex < data.options.length;
      }
      return true;
    },
    {
      message: "correctOptionIndex is out of range",
      path: ["correctOptionIndex"],
    }
  );



export type TCreateQuestionPayload = z.infer<
  typeof createQuestionSchema
>;

const questionValidationZodSchema = {
  createQuestionSchema,
  updateQuestionSchema
};

export default questionValidationZodSchema;