import { BadRequestError } from '../../app/errors/request/apiError';
import { IUser } from '../../app/modules/user-module/user.interface';
import User from '../../app/modules/user-module/user.model';
import config from '../../config';
import stripe from '../index';

export const createConnectedAccountOnboardingLink = async (user: IUser) => {
  if (user.stripeAccountId && user.isStripeConnected) {
    throw new BadRequestError('your account has been created already.');
  }

  // Step 2: If Stripe account exists but not ready yet
  if (user.stripeAccountId && !user.isStripeConnected) {
    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    console.log({account: account})
    // const isStripeFullyOk = account?.capabilities?.card_payments === 'active' && account?.capabilities?.transfers === 'active';

    // if (isStripeFullyOk) {
    //   // Mark user as Stripe ready
    //   user.isStripeConnected = true;
    //   await user.save();

    //   return null; // Already ready, no need for onboarding link
    // }

  
    const onboardingData = await stripe.accountLinks.create({
      account: user.stripeAccountId,
      refresh_url: `${config.onboarding_refresh_url}?accountId=${user.stripeAccountId}`,
      return_url: config.onboarding_return_url,
      type: 'account_onboarding',
    });

    return onboardingData.url;
  }


  if (!user.stripeAccountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      country: 'US',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      settings: {
        payouts: { schedule: { interval: 'manual' } },
      },
    });

    const onboardingData = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${config.onboarding_refresh_url}?accountId=${account.id}`,
      return_url: config.onboarding_return_url,
      type: 'account_onboarding',
    });

    const updateduser = await User.findByIdAndUpdate(
      user._id,
      { $set: { stripeAccountId: account.id, isStripeConnected: false } },
      { new: true },
    );

    if (!updateduser) {
      await stripe.accounts.del(account.id); // cleanup

      throw new BadRequestError('Failed to save Stripe account ID into DB!');
    }

    return onboardingData.url;
  }

  return null;
};
