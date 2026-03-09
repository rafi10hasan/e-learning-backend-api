import { deleteImageFromCloudinary } from '../../../cloudinary/deleteImageFromCloudinary';
import { uploadToCloudinary } from '../../../cloudinary/uploadImageToCLoudinary';
import { BadRequestError, NotFoundError } from '../../errors/request/apiError';
import { TBlogImages } from './blog.constant';
import IBlog from './blog.interfaces';
import Blog from './blog.model';

export const createBlog = async (data: IBlog, file: TBlogImages) => {
  let blogImage: string | null = null;

  if (!file.blog_image?.[0]) {
    throw new BadRequestError('blog image is required');
  }
  const image = await uploadToCloudinary(file.blog_image?.[0], 'blog_images');
  if (image.secure_url) {
    blogImage = image.secure_url;
  }

  const blogData = {
    ...data,
    image: blogImage,
  };

  let result;
  try {
    result = await Blog.create(blogData);
  } catch (error) {
    if (!result) {
      if (blogImage) {
        await deleteImageFromCloudinary(blogImage);
      }

      throw new BadRequestError('Failed to create Blog');
    }
  }
  return result;
};

// update blog
export const updateBlog = async (id: string, data: Partial<IBlog>, file: TBlogImages) => {
  const currentBlog = await Blog.findById(id);
  if (!currentBlog) {
    throw new NotFoundError('Blog not found');
  }

  const updateData = { ...data };
  let newImageUploaded = false;

  if (file?.blog_image?.[0]) {
    const upload = await uploadToCloudinary(file.blog_image[0], 'blog_images');
    if (upload.secure_url) {
      updateData.image = upload.secure_url;
      newImageUploaded = true;
    }
  }
  console.log({updateData})
  try {
    const result = await Blog.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });

    if (newImageUploaded && currentBlog.image) {
      await deleteImageFromCloudinary(currentBlog.image);
    }

    return result;
  } catch (error) {
    if (newImageUploaded) {
      await deleteImageFromCloudinary(currentBlog.image);
    }
    throw new BadRequestError('Failed to update Blog. Storage has been rolled back.');
  }
};

const deleteBlog = async (id: string) => {
  const blog = await Blog.findById(id);

  if (!blog) {
    throw new NotFoundError('Blog not found');
  }

  if (blog.image) {
    try {
      await deleteImageFromCloudinary(blog.image);
    } catch (error) {
      throw new BadRequestError('Failed to delete image from Cloudinary:');
    }
  }
  const result = await Blog.findByIdAndDelete(id);

  if (!result) {
    throw new BadRequestError('Failed to delete blog');
  }

  return null;
};


const retrieveAllBlogsByRole = async (
  query: Record<string, any>,
  role: string,
): Promise<{
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  data: any[];
}> => {
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const matchStage: any = {};

  if (role === 'guest') {
    matchStage.viewers = { $in: ['guest', 'both'] };
  } else if (role === 'host') {
    matchStage.viewers = { $in: ['host', 'both'] };
  }

  console.log(matchStage);
  const result = await Blog.aggregate([
    { $match: matchStage },
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        image: 1,
      },
    },
    {
      $facet: {
        blogData: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    },
  ]);
  console.log('result', result);
  const data = result[0]?.blogData || [];
  const total = result[0]?.totalCount[0]?.count || 0;

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data,
  };
};

const retrieveAllBlogs = async (
  query: Record<string, any>,
): Promise<{
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  data: any[];
}> => {
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const searchTerm = (query.searchTerm as string)?.trim() || '';

  const matchStage: any = {};

  if (searchTerm) {
    matchStage.$or = [
      { title: { $regex: searchTerm, $options: 'i' } },
      { Blog: { $regex: searchTerm, $options: 'i' } },
      { status: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  const result = await Blog.aggregate([
    { $match: matchStage },
    {
      $facet: {
        data: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    },
  ]);

  const data = result[0]?.data || [];
  const total = result[0]?.totalCount[0]?.count || 0;

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data,
  };
};

const retrieveRecentBlogs = async (limit: number, userRole: 'guest' | 'host') => {
  const query: any = { status: 'published' };

  if (userRole) {
    query.viewers = { $in: [userRole, 'both'] };
  }

  const result = await Blog.aggregate([
    { 
      $match: query 
    },
    { 
      $sort: { createdAt: -1 } 
    },
    { 
      $limit: limit 
    },
    {
      $project: {
        title: 1,
        description: 1,
        image: 1
      }
    }
  ]);
  
  return result;
};

const retrieveSpecificBlogDetails = async (id: string) => {
  const result = await Blog.findById(id).select('title description image category createdAt');
  if (!result) {
    throw new NotFoundError('blog are not found');
  }
  return result;
};

export default {
  createBlog,
  updateBlog,
  deleteBlog,
  retrieveAllBlogsByRole,
  retrieveRecentBlogs,
  retrieveAllBlogs,
  retrieveSpecificBlogDetails,
};
