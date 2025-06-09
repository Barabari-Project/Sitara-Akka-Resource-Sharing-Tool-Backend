// models/User.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  std?: string;
}

const UserSchema: Schema = new Schema<IUser>({
  phoneNumber: { type: String, required: true, unique: true },
  firstName: String,
  lastName: String,
  age: Number,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  std: String
});

export const UserModel = mongoose.model<IUser>('User', UserSchema);
