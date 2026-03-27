

export const SOURCE_TYPES = {
    ARCHIVE: 'archive',
    PRACTICE: 'practice',
    BOTH: 'both',
} as const;


export const QUERSTION_STATUS = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
} as const;



export type TSources = (typeof SOURCE_TYPES)[keyof typeof SOURCE_TYPES];

export type TQuestionStatus = (typeof QUERSTION_STATUS)[keyof typeof QUERSTION_STATUS];
