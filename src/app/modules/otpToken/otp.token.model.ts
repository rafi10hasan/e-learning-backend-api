import bcrypt from 'bcrypt';
import mongoose, { Schema } from "mongoose";
import config from "../../../config";
import { IOtpToken } from './otp.token.interface';

const otpTokenSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['email_verification', 'password_reset'] },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

otpTokenSchema.pre('save', async function () {
    const salt = await bcrypt.genSalt(Number(config.salt_rounds));
    if (this.isModified('otpHash') && this.otpHash) {
        this.otpHash = await bcrypt.hash(this.otpHash, salt);
    }
});

otpTokenSchema.methods.isVerificationOtpMatched = async function (plainTextOtp: string): Promise<boolean> {
    return await bcrypt.compare(plainTextOtp, this.otpHash);
};

otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OtpToken = mongoose.model<IOtpToken>('OtpToken', otpTokenSchema);

export default OtpToken;