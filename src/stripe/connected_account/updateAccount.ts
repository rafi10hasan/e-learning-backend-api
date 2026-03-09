import { BadRequestError } from '../../app/errors/request/apiError';
import { IUser } from '../../app/modules/user-module/user.interface';
import config from '../../config';
import stripe from '../index';

export const updateStripeConnectedAccount = async (user: IUser) => {
  if (!user.stripeAccountId) {
    throw new BadRequestError('Stripe Account does not exist!.');
  }

  // Step 2: If Stripe account exists but not ready yet

  const onboardingData = await stripe.accountLinks.create({
    account: user.stripeAccountId,
    refresh_url: `${config.onboarding_refresh_url}?accountId=${user.stripeAccountId}`,
    return_url: config.onboarding_return_url,
    type: 'account_onboarding',
  });

  return onboardingData.url;
};
