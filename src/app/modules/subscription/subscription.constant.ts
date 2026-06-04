export const SUBSCRIPTION_PLAN = {
    MATURA: 'matura',
    SEMI_MATURA: 'semi_matura',
    PROVIME: 'provime',
    FULL_ACCESS: 'full-access'
} as const;

export const SUBSCRIPTION_MODE = {
    ONE_MONTH: 'one_month1',
    THREE_MONTHS: 'three_months',
} as const;

export const SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
} as const;



export type TSubscriptionPlan = (typeof SUBSCRIPTION_PLAN)[keyof typeof SUBSCRIPTION_PLAN];
export type TSubscriptionMode = (typeof SUBSCRIPTION_MODE)[keyof typeof SUBSCRIPTION_MODE];
export type TSubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];
