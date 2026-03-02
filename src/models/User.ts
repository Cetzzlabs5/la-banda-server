import { Document, model, Schema } from "mongoose";
import { hashPassword } from "../utils/auth";

export enum Role {
    ADMIN = 'admin',
    USER = 'user'
}

export interface IUser extends Document {
    name: string;
    lastName: string;
    email: string;
    password: string;
    birthdate?: Date;
    isActive: boolean;
    role: Role;
}

const userSchema = new Schema<IUser>({
    name: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
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
    isActive: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        enum: Role,
        default: Role.USER
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