// import { Types } from "mongoose";
// import { TSubscriptionMode, TSubscriptionPlan, TSubscriptionStatus } from "../user/user.constant";

import { Types } from "mongoose";
import { TSubscriptionMode, TSubscriptionPlan, TSubscriptionStatus } from "./subscription.constant";


export interface ISubscription {
    // Active
    user: Types.ObjectId;
    plan: TSubscriptionPlan | null;
    billingCycle: TSubscriptionMode | null;
    status: TSubscriptionStatus;
    price: number;
    activatedAt: Date | null;
    expiryDate: Date | null;

}



