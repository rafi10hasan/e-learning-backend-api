import z from "zod";

export const questionListValidation = z.object({
  // pagination
  page: z.coerce
    .number()
    .int({ message: "Page must be an integer" })
    .min(1, { message: "Page must be at least 1" })
    .optional()
    .default(1),

  limit: z.coerce
    .number()
    .int({ message: "Limit must be an integer" })
    .min(1, { message: "Limit must be at least 1" })
    .max(100, { message: "Limit cannot exceed 100" })
    .optional()
    .default(20),

  // search
  searchTerm: z
    .string({ message: "Search term must be a string" })
    .trim()
    .optional(),

  // filters
  examType: z
    .enum(["semi_matura", "matura", "provime"], {
      message: "Exam type must be semi_matura, matura or provime",
    })
    .optional(),

  year: z.coerce
    .number({ message: "Year must be a number" })
    .int({ message: "Year must be an integer" })
    .min(2000, { message: "Year must be 2000 or later" })
    .max(new Date().getFullYear(), { message: "Year cannot be in the future" })
    .optional(),

  subjectName: z
    .string({ message: "Subject must be a string" })
    .trim()
    .optional(),

  questionText: z
    .string({ message: "Question text must be a string" })
    .trim()
    .optional(),

  facultyName: z
    .string({ message: "Faculty must be a string" })
    .trim()
    .optional(),

  departmentName: z
    .string({ message: "Department must be a string" })
    .trim()
    .optional(),

  passageId: z
    .string({ message: "Passage ID must be a string" })
    .regex(/^[a-f\d]{24}$/i, { message: "Passage ID must be a valid ObjectId" })
    .optional(),

  access: z
    .enum(["free", "premium"], {
      message: "Access must be free or premium",
    })
    .optional(),

  difficultyLevel: z
    .enum(["easy", "medium", "hard"], {
      message: "Difficulty level must be easy, medium or hard",
    })
    .optional(),

  status: z
    .enum(["published", "draft", "hidden", "archived"], {
      message: "Status must be published, draft, hidden or archived",
    })
    .optional(),
});



export const testListValidation = z.object({
  // pagination
  page: z.coerce
    .number()
    .int({ message: "Page must be an integer" })
    .min(1, { message: "Page must be at least 1" })
    .optional()
    .default(1),

  limit: z.coerce
    .number()
    .int({ message: "Limit must be an integer" })
    .min(1, { message: "Limit must be at least 1" })
    .max(100, { message: "Limit cannot exceed 100" })
    .optional()
    .default(20),

  // search
  searchTerm: z
    .string({ message: "Search term must be a string" })
    .trim()
    .optional(),

  // filters
  examType: z
    .enum(["semi_matura", "matura", "provime"], {
      message: "Exam type must be semi_matura, matura or provime",
    })
    .optional(),

  year: z.coerce
    .number({ message: "Year must be a number" })
    .int({ message: "Year must be an integer" })
    .min(2000, { message: "Year must be 2000 or later" })
    .max(new Date().getFullYear(), { message: "Year cannot be in the future" })
    .optional(),

  subjectName: z
    .string({ message: "Subject must be a string" })
    .trim()
    .optional(),


  facultyName: z
    .string({ message: "Faculty must be a string" })
    .trim()
    .optional(),

  departmentName: z
    .string({ message: "Department must be a string" })
    .trim()
    .optional(),

  title: z
    .string({ message: "Title must be a string" })
    .trim()
    .optional(),

  testCode: z
    .string({ message: "Test code must be a string" })
    .trim()
    .optional(),

  testType: z
    .enum(["official", "additional"], {
      message: "Test type must be official or additional",
    })
    .optional(),
  access: z
    .enum(["free", "premium"], {
      message: "Access must be free or premium",
    })
    .optional(),

  status: z
    .enum(["published", "draft"], {
      message: "Status must be published or draft",
    })
    .optional(),
});


export type TQuestionListInput = z.infer<typeof questionListValidation>;
export type TTestListInput = z.infer<typeof testListValidation>;

const questionQueryValidationZodSchema = {
  questionListValidation,
  testListValidation,
};

export default questionQueryValidationZodSchema;