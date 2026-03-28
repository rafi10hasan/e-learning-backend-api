import z from "zod";


const createTestSchema = z.object({
    title: z.string({ message: "Title is required" }).min(1, { message: "Title cannot be empty" }),
    examType: z.enum(["semi_matura", "matura", "provime"], { message: "Invalid exam type" }),
    year: z
        .number({ message: "Year is required" })
        .int({ message: "Year must be an integer" })
        .min(2000, { message: "Year must be 2000 or later" })
        .max(new Date().getFullYear(), { message: "Year cannot be in the future" }),
    // structureType: z.string({ message: "Structure type is required" }).min(1, { message: "Structure type cannot be empty" }),
    testType: z.enum(["official", "additional"], { message: "Test type must be official or additional" }),
    access: z.enum(["free", "premium"], { message: "Access must be free or premium" }).default("free"),
    questionIds: z.array(z.string({ message: "Question ID must be a string" })).optional(),
});



export type TCreateTestPayload = z.infer<
    typeof createTestSchema
>;

const testValidationZodSchema = {
    createTestSchema,
};

export default testValidationZodSchema;