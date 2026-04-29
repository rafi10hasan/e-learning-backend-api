import z from "zod";

const createFacultySchema = z.object({
    name: z.string({ message: "Faculty name must be a string" }).min(1, {
        message: "Faculty name cannot be empty",
    }),
});

const getFacultyQuerySchema = z.object({
    examType: z.enum(["semi_matura", "matura", "provime"], {
        message: "Exam type must be semi_matura, matura or provime",
    }),
});

export type TCreateFacultyPayload = z.infer<
    typeof createFacultySchema
>;

export type TGetFacultyQueryPayload = z.infer<
    typeof getFacultyQuerySchema
>;

const facultyValidationZodSchema = {
    createFacultySchema,
    getFacultyQuerySchema,
};

export default facultyValidationZodSchema;