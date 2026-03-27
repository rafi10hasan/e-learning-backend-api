
export const TEST_STATUS = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
} as const;

export type TTestStatus = (typeof TEST_STATUS)[keyof typeof TEST_STATUS];
