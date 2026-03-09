import { Document } from 'mongoose';

interface IBlog extends Document {
  title: string;
  description: string;
  category: string;
  status?: 'draft' | 'published';
  viewers?: 'guest' | 'host' | 'both';
  image: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export default IBlog;
