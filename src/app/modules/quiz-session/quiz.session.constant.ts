export const QUIZ_STATUS = {
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    EXPIRED: 'expired',
} as const;

export type TQuizStatus = (typeof QUIZ_STATUS)[keyof typeof QUIZ_STATUS];