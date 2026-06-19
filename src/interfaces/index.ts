
export const EXAM_TYPES = {
    SEMI_MATURA: 'semi_matura',
    MATURA: 'matura',
    ENTRANCE_EXAM: 'provime'
} as const;

export const TEST_TYPES = {
    OFFICIAL: 'official',
    ADDITIONAL: 'additional',
} as const;

export const ACCESS_TYPES = {
    FREE: 'free',
    PREMIUM: 'premium',
} as const;

export const USER_LANGUAGES = {
    ALBANIAN: 'albanian',
    ENGLISH: 'english',
} as const;

export type TExamTypes = (typeof EXAM_TYPES)[keyof typeof EXAM_TYPES];

export type TAccessTypes = (typeof ACCESS_TYPES)[keyof typeof ACCESS_TYPES];

export type TTestTypes = (typeof TEST_TYPES)[keyof typeof TEST_TYPES];

export type TUserLanguages = (typeof USER_LANGUAGES)[keyof typeof USER_LANGUAGES];