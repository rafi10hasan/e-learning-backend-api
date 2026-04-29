export const QUIZ_TYPES = {
    OFFICIAL: 'official',
    ADDITIONAL: 'additional',
} as const;


export const QUIZ_STATUS = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
} as const;

export type TQuizTypes = (typeof QUIZ_TYPES)[keyof typeof QUIZ_TYPES];
export type TQuizStatus = (typeof QUIZ_STATUS)[keyof typeof QUIZ_STATUS];