// models/User.ts
import mongoose, { Schema, Document } from 'mongoose';
import { UserRoles } from '../middleware/auth.middleware';

export interface IUser extends Document {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  std?: string;
  role: UserRoles;
  schoolName?: string;
  district?: string;
  medium?: string;
  questionAnswers?: {
    question: number;
    ans: string;
  }[];
}

const UserSchema: Schema = new Schema<IUser>({
  phoneNumber: { type: String, required: true, unique: true },
  firstName: String,
  lastName: String,
  age: Number,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  std: String,
  role: { type: String, enum: Object.values(UserRoles), default: UserRoles.USER },
  schoolName: String,
  district: String,
  medium: String,
  questionAnswers: [
    {
      question: { type: Number, required: true },
      ans: { type: String, required: true },
    }
  ]
});

export const UserModel = mongoose.model<IUser>('User', UserSchema);
