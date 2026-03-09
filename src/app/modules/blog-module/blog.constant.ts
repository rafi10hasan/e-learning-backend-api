export type TBlogImages = {
  blog_image: Express.Multer.File[];
};

export const PUBLISH_STATUS = {
   DRAFT: 'draft',
   PUBLISHED: 'published'
} as const;

export const VIEW_STATUS = {
   GUEST: 'guest',
   HOST: 'host',
   BOTH: 'both'
} as const;

export type TView = (typeof VIEW_STATUS)[keyof typeof VIEW_STATUS];

export type TCategory = (typeof PUBLISH_STATUS)[keyof typeof PUBLISH_STATUS];