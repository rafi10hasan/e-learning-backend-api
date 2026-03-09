import { BadRequestError } from '../../app/errors/request/apiError';
import stripe from '../index';

export const retrieveConnectedAccount = async (accountId: string) => {
  if (!accountId) {
    throw new BadRequestError('no stripe account found');
  }
  const account = await stripe.accounts.retrieve(accountId);
  console.log(account)
  return account
};
