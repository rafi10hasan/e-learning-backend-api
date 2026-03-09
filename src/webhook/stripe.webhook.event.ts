export const WEBHOOK_EVENT = {
  PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
  SETUP_INTENT_SUCCEEDED: 'setup_intent.succeeded',
  ACCOUNT_UPDATED: 'account.updated',
  PAYMENT_METHOD_ATTACHED: 'payment_method.attached',
  PAYMENT_METHOD_DETACHED: 'payment_method.detached',
  CUSTOMER_UPDATED: 'customer.updated',
} as const;