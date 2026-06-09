import z from "zod";


const createSubjectSchema = z.object({
  name: z.string({ message: "Subject name must be a string" }).min(1, {
    message: "Subject name cannot be empty",
  }),
  examType: z.enum(["semi_matura", "matura", "provime"], {
    message: "Exam type must be semi_matura, matura or provime",
  }),
});

const getSubjectQuerySchema = z.object({
  examType: z.enum(["semi_matura", "matura", "provime"], {
    message: "Exam type must be semi_matura, matura or provime",
  }),
});

const getSubjectsByDepartmentsSchema = z.object({
   departments : z.array(z.string().min(1, {
    message: "Department ID cannot be empty",
  }))
});

export type TCreateSubjectPayload = z.infer<
  typeof createSubjectSchema
>;

export type TGetSubjectQueryPayload = z.infer<
  typeof getSubjectQuerySchema
>;


const subjectValidationZodSchema = {
  createSubjectSchema,
  getSubjectQuerySchema,
  getSubjectsByDepartmentsSchema
};

export default subjectValidationZodSchema;