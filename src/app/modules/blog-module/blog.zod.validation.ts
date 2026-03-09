import z from 'zod';

const createBlogSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(50, 'Title must be under 40 characters'),

  description: z.string().trim().min(30, 'Descriptin must be atleat 30 characters').max(300, 'Description must be under 300 characters'),

  category: z.string().trim().min(1, 'Category is required'),

  status: z.enum(['draft', 'published']).default('draft'),

  viewers: z.enum(['guest', 'host', 'both']).default('both'),
});

const updateBlogSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(50, 'Title must be under 50 characters').optional(),

  description: z.string().trim().min(30, 'Descriptin must be atleat 30 characters').max(300, 'Description must be under 300 characters').optional(),

  category: z.string().trim().min(1, 'Category is required').optional(),

  status: z.enum(['draft', 'published']).default('draft').optional(),

  viewers: z.enum(['guest', 'host', 'both']).default('both').optional(),
});

const blogValidationZodSchema = {
  createBlogSchema,
  updateBlogSchema
};

export default blogValidationZodSchema;
