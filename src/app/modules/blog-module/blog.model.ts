import mongoose, { Schema } from 'mongoose';
import IBlog from './blog.interfaces';

const blogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: [true, 'title is required'] },
    description: { type: String, required: [true, 'description is required'] },
    category: { type: String, required: [true, 'category is required'] },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    viewers: {
      type: String,
      enum: ['guest', 'host', 'both'],
      default: 'both',
    },
    image: { type: String, required: [true, 'image is required'] },
  },
  {
    timestamps: true,
  },
);

const Blog = mongoose.model<IBlog>('Blog', blogSchema);
export default Blog;
