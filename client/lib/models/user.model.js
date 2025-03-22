import { model, Schema, models } from "mongoose";

const UserSchema = new Schema(
    {
        clerkId: { type: String, required: true, unique: true },
        fullName: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        userName: { type: String, required: true, unique: true },
        profileImageUrl: { type: String },

        dateOfBirth: { type: Date, required: true },
        phoneNumber: { type: String, required: true },

        address: {
            street: { type: String },
            city: { type: String },
            state: { type: String },
            country: { type: String },
            postalCode: { type: String }
        },

        financialProfile: {
            accountType: { type: String, enum: ['individual', 'business', 'institutional'], default: 'individual' },
            riskTolerance: { type: String, enum: ['conservative', 'moderate', 'aggressive'], default: 'moderate' },
            investmentGoals: [{ type: String }],
            preferredCurrency: { type: String, default: 'INR' }
        },

        kycVerified: { type: Boolean, default: false },
        kycVerificationDate: { type: Date },
        identityDocuments: [{
            documentType: { type: String, enum: ['passport', 'driverLicense', 'nationalID', 'other'] },
            documentNumber: { type: String },
            verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
            uploadDate: { type: Date, default: Date.now }
        }],

        lastLoginDate: { type: Date },
        preferences: {
            notifications: {
                email: { type: Boolean, default: true },
                sms: { type: Boolean, default: false },
                inApp: { type: Boolean, default: true }
            },
            dataVisualization: { type: String, enum: ['simple', 'detailed', 'technical'], default: 'simple' },
            aiAssistanceLevel: { type: String, enum: ['basic', 'advanced', 'expert'], default: 'basic' }
        },

        role: { type: String, enum: ['user', 'analyst', 'admin'], default: 'user' },
        permissions: [{ type: String }],

        isActive: { type: Boolean, default: true },
        deactivationReason: { type: String },
        deactivationDate: { type: Date }
    },
    { timestamps: true }
);

const User = models.User || model("User", UserSchema);

export default User;