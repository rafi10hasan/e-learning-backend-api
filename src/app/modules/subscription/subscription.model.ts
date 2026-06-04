import mongoose, { Schema } from "mongoose";
import { SUBSCRIPTION_MODE, SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS } from "./subscription.constant";
import { ISubscription } from "./subscription.interface";

const SubscriptionSchema = new Schema<ISubscription>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        // --- Active Subscription Fields ---
        plan: {
            type: String,
            enum: [...Object.values(SUBSCRIPTION_PLAN), null],
            default: null
        },

        billingCycle: {
            type: String,
            enum: [...Object.values(SUBSCRIPTION_MODE), null],
            default: null

        },
        price:{
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: Object.values(SUBSCRIPTION_STATUS),
            default: SUBSCRIPTION_STATUS.ACTIVE
        },
        activatedAt: {
            type: Date,
            default: null
        },
        expiryDate: {
            type: Date,
            default: null
        },

    
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Indexing for faster financial queries
SubscriptionSchema.index({ status: 1, activatedAt: 1 });

const Subscription = mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
export default Subscription;