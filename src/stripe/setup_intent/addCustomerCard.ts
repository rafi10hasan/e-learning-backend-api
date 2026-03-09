import { IUser } from '../../app/modules/user-module/user.interface';
import stripe from '../index';

export const addCustomerPaymentCard = async (user: IUser) => {
  try {
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: user.fullName,
        email: user.email,
        metadata: { userId: user._id.toString() },
      });
      const setupIntent = await stripe.setupIntents.create({
        customer: customer?.id,
        payment_method_types: ['card'],
        usage: 'off_session',
      });

      return {
        clientSecret: setupIntent.client_secret,
        customerId: customer?.id,
      };
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: user.stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    });

    return {
      clientSecret: setupIntent.client_secret,
      customerId: user.stripeCustomerId,
    };
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
