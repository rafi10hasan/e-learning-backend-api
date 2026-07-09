

import z from "zod";
import { BLOG_CATEGORY } from "./blog.constant";

const createBlogSchema = z.object({
    title: z.string({ message: "Blog title must be a string" }).min(1, {
        message: "Blog title cannot be empty",
    }),
    content: z.string({ message: "Blog content must be a string" }).min(1, {
        message: "Blog content cannot be empty",
    }),
    category: z.enum(Object.values(BLOG_CATEGORY), {
        message: "Blog category is invalid",
    }),
    seoTitle: z.string({ message: "Blog SEO title must be a string" }).optional(),
    seoDescription: z.string({ message: "Blog SEO description must be a string" }).optional(),
    publishedAt: z.coerce.date({ message: "Blog published date must be a date" }).optional(),
    status: z.enum(["draft", "published", "hidden"], {
        message: "Blog status must be draft, published or archived",
    }).default("draft"),
});

/*
    title: string;
    content: string;
    image: string | null;
    seoTitle: string | null;
    category: TBlogCategory;
    seoDescription: string | null;
    status: TBlogStatus;
    publishedAt: Date | null;
   

    export const BLOG_CATEGORY = {
        ENTRANCE_EXAM: 'Entrance Exams',
        MATURA: 'Matura',
        SEMI_MATURA: 'Semi Matura',
        PLATFORM_UPDATES: 'Platform Updates',
        UNIVERSITY_PREPARATIONS: 'University Preparations',
        STUDY_TIPS: 'Study Tips',
        QUIZ_TIPS: 'Quiz Tips',
    } as const;
*/

export type TCreateBlogPayload = z.infer<
    typeof createBlogSchema
>;



const blogValidationZodSchema = {
    createBlogSchema,
};

export default blogValidationZodSchema;