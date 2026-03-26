export const EXAM_TYPES = {
    SEMIMATURE: 'semi_matura',
    MATURE: 'matura',
    ENTRANCE_EXAM: 'provime'
} as const;

export const TEST_TYPES = {
    OFFICIAL: 'official',
    ADDITIONAL: 'additional',
} as const;

export const SOURCE_TYPES = {
    ARCHIVE: 'archive',
    PRACTICE: 'practice',
    BOTH: 'both',
} as const;

export const ACCESS_TYPES = {
    FREE: 'archive',
    PREMIUM: 'practice',
} as const;

export const QUERSTION_STATUS = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
} as const;

export type TExamTypes = (typeof EXAM_TYPES)[keyof typeof EXAM_TYPES];

export type TSources = (typeof SOURCE_TYPES)[keyof typeof SOURCE_TYPES];

export type TQuestionStatus = (typeof QUERSTION_STATUS)[keyof typeof QUERSTION_STATUS];

export type TAccessTypes = (typeof ACCESS_TYPES)[keyof typeof ACCESS_TYPES];

export type TTestTypes = (typeof TEST_TYPES)[keyof typeof TEST_TYPES];