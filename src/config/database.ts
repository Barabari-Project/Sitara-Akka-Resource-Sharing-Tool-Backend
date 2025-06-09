import mongoose from 'mongoose';

export const connectToDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGODB_DATABASE_URL!, {
      dbName: process.env.MONGODB_DATABASE_NAME!
    });
    console.log('Database connected successfully !');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};