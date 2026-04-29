import z from "zod";

const createDepartmentSchema = z.object({
    name: z.string({ message: "Department name must be a string" }).min(1, {
        message: "Department name cannot be empty",
    }),
});

const getDepartmentQuerySchema = z.object({
    examType: z.enum(["semi_matura", "matura", "provime"], {
        message: "Exam type must be semi_matura, matura or provime",
    }),
});

export type TCreateDepartmentPayload = z.infer<
    typeof createDepartmentSchema
>;

export type TGetDepartmentQueryPayload = z.infer<
    typeof getDepartmentQuerySchema
>;

const departmentValidationZodSchema = {
    createDepartmentSchema,
    getDepartmentQuerySchema,
};

export default departmentValidationZodSchema;