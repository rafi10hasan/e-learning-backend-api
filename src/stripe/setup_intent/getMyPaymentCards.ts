import { IUser } from '../../app/modules/user-module/user.interface';
import stripe from '../index';

export const getMyPaymentCards = async (user: IUser) => {
  try {
    const customer = await stripe.customers.retrieve(user.stripeCustomerId);

    if (!customer.deleted && customer.invoice_settings) {
      const defaultPaymentMethodId = customer.invoice_settings.default_payment_method;

      const paymentMethods = await stripe.paymentMethods.list({
        customer: customer.id,
        type: 'card',
      });

      const cards = paymentMethods.data.map((pm) => ({
        paymentMethodId: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        isDefault: pm.id === defaultPaymentMethodId,
      }));

      return cards;
    }
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
