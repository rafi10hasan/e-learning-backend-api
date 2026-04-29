

export const SOURCE_TYPES = {
    ARCHIVE: 'archive',
    PRACTICE: 'practice',
    BOTH: 'both',
} as const;


export const QUERSTION_STATUS = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
} as const;

export const QUERSTION_DIFFICULTY = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
} as const;

export type TSources = (typeof SOURCE_TYPES)[keyof typeof SOURCE_TYPES];
export type TQuestionDifficulty = (typeof QUERSTION_DIFFICULTY)[keyof typeof QUERSTION_DIFFICULTY];
export type TQuestionStatus = (typeof QUERSTION_STATUS)[keyof typeof QUERSTION_STATUS];

