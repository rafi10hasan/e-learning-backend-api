import { IUser } from '../../app/modules/user-module/user.interface';
import stripe from '../index';

export const setDefaultPaymentMethod = async (user: IUser,paymentMethodId: string) => {
  try {
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  } catch (error: any) {
    throw new Error(error);
  }
};

/*

await stripe.customers.update(customerId, {
  invoice_settings: {
    default_payment_method: paymentMethodId,
  },
});


*/
