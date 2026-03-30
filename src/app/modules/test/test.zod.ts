import z from "zod";
import { ACCESS_TYPES, EXAM_TYPES, TEST_TYPES } from "../../../interfaces";


const createTestSchema = z.object({
    title: z.string({ message: "Title is required" }).min(1, { message: "Title cannot be empty" }),
    examType: z.enum([EXAM_TYPES.ENTRANCE_EXAM, EXAM_TYPES.MATURE, EXAM_TYPES.SEMIMATURE], { message: "Invalid exam type" }),
    year: z
        .number({ message: "Year is required" })
        .int({ message: "Year must be an integer" })
        .min(2000, { message: "Year must be 2000 or later" })
        .max(new Date().getFullYear(), { message: "Year cannot be in the future" }),
    // structureType: z.string({ message: "Structure type is required" }).min(1, { message: "Structure type cannot be empty" }),
    testType: z.enum([TEST_TYPES.OFFICIAL, TEST_TYPES.ADDITIONAL], { message: "Test type must be official or additional" }),
    access: z.enum([ACCESS_TYPES.FREE, ACCESS_TYPES.PREMIUM], { message: "Access must be free or premium" }).default("free"),
    totalSubjects: z.coerce.number({ message: "Total subjects must be a number" }),
    facultyId: z.string({ message: "Faculty ID must be a string" }).optional(),
    questionIds: z.array(z.string({ message: "Question ID must be a string" })),
    departmentIds: z.array(z.string({ message: "Department ID must be a string" })).optional(),
    subjectIds: z.array(z.string({ message: "Subject ID must be a string" })).optional(),
}).superRefine((data, ctx) => {

    if (data.examType === EXAM_TYPES.SEMIMATURE || data.examType === EXAM_TYPES.MATURE) {
        if (!data.subjectIds || data.subjectIds.length === 0) {
            ctx.addIssue({
                code: 'custom',
                maximum: 1,
                origin: 'superRefine',
                inclusive: true,
                path: ['error'],
                message: "Subject ID is required when exam type is semi_matura or matura",
            });
        }
        if (data.departmentIds && data.departmentIds.length > 0) {
            ctx.addIssue({
                code: 'custom',
                maximum: 1,
                origin: 'superRefine',
                inclusive: true,
                path: ['error'],
                message: "Department ID is not required when exam type is semi_matura or matura",
            });
        }
        if (data.facultyId) {
            ctx.addIssue({
                code: 'custom',
                maximum: 1,
                origin: 'superRefine',
                inclusive: true,
                path: ['error'],
                message: "Faculty ID is not required when exam type is semi_matura or matura",
            });
        }
    }

    if (data.examType === EXAM_TYPES.ENTRANCE_EXAM) {
        if (!data.facultyId) {
            ctx.addIssue({
                code: 'custom',
                maximum: 1,
                origin: 'superRefine',
                inclusive: true,
                path: ['error'],
                message: "Faculty ID is required when exam type is entrance exam",
            });
        }
        if (!data.departmentIds || data.departmentIds.length === 0) {
            ctx.addIssue({
                code: 'custom',
                maximum: 1,
                origin: 'superRefine',
                inclusive: true,
                path: ['error'],
                message: "Department ID is required when exam type is entrance exam",
            });
        }

        if (data.subjectIds && data.subjectIds.length > 0) {
            ctx.addIssue({
                code: 'custom',
                maximum: 1,
                origin: 'superRefine',
                inclusive: true,
                path: ['error'],
                message: "Subject ID is not required when exam type is entrance exam",
            });
        }
    }
});;


export type TCreateTestPayload = z.infer<
    typeof createTestSchema
>;

const testValidationZodSchema = {
    createTestSchema,
};

export default testValidationZodSchema;