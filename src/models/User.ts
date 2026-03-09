import { Document, model, Schema } from "mongoose";
import { hashPassword } from "../utils/auth";

export enum Role {
    ADMIN = 'ADMIN',
    USER = 'USER',
    OWNER = 'OWNER',
    WAITER = 'WAITER'
}

export interface IUser extends Document {
    name: string;
    lastName: string;
    email: string;
    password: string;
    birthdate?: Date;
    role: Role;
    avatarUrl?: string; // or string if required
    isActive: boolean;
}

const userSchema = new Schema<IUser>({
    name: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    birthdate: {
        type: Date,
    },
    role: {
        type: String,
        enum: Object.values(Role),
        default: Role.USER
    },
    avatarUrl: {
        type: String,
    },
    isActive: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

userSchema.pre('save', async function () {
    if (this.isModified('password')) {
        this.password = await hashPassword(this.password)
    }
})

const User = model<IUser>('User', userSchema)

export default User