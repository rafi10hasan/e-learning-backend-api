/* eslint-disable no-console */
import { Request, Response } from 'express';

import Stripe from 'stripe';
import User from '../app/modules/user-module/user.model';
import config from '../config';
import asyncHandler from '../shared/asynchandler';
import { WEBHOOK_EVENT } from './stripe.webhook.event';
// import logger from '../config/logger';
// import { IAuth } from '../modules/Auth/auth.interface';

const stripe = new Stripe(config.stripe_secret_key as string);

export const stripeWebhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = config.stripe_webhook_secret as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook Error:', errorMessage);

    // FIX: Return early so the code below is never reached on error
    return res.status(400).send(`Webhook Error: ${errorMessage}`);
  }

  // TypeScript now knows 'event' is definitely assigned here
  switch (event.type) {
    // payment intent succedd
    case WEBHOOK_EVENT.PAYMENT_INTENT_SUCCEEDED:
      // const paymentIntent = event.data.object;
      break;

    // account updated
    case WEBHOOK_EVENT.ACCOUNT_UPDATED: {
      const account = event.data.object;
      const stripeAccountId = account.id;

      if (account?.capabilities?.card_payments === 'active' && account?.capabilities?.transfers === 'active') {
        const user = await User.findOne({ stripeAccountId });

        if (!user) {
          console.log('No local user found for this Stripe account.');
          break; // stop here since no user exists
        }

        user.isStripeConnected = true;
        await user.save();

        console.log(`User ${user.email} is now marked as Stripe connected.`);
      }
      break;
    }

    // setup intent succedd
    case WEBHOOK_EVENT.SETUP_INTENT_SUCCEEDED: {
      const si = event.data.object as Stripe.SetupIntent;
      if (!si) {
        break;
      }
    }

    case WEBHOOK_EVENT.CUSTOMER_UPDATED: {
      const customer = event.data.object as Stripe.Customer;
      console.log('customer updated:', customer.id);
      break;
    }

    case WEBHOOK_EVENT.PAYMENT_METHOD_ATTACHED: {
      const pm = event.data.object as Stripe.PaymentMethod;
      console.log('Payment method attached:', pm.id);
      break;
    }

    case WEBHOOK_EVENT.PAYMENT_METHOD_DETACHED: {
      const pm = event.data.object as Stripe.PaymentMethod;
      console.log('Payment method detached:', pm.id);
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).json({ received: true });
});
