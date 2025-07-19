// models/Template.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITemplate extends Document {
  type: string;
  templateName: string;
}

const WhatsappTemplateSchema: Schema = new Schema<ITemplate>({
  type: { type: String, required: true },
  templateName: { type: String, required: true },
});

export const WhatsappTemplateModel = mongoose.model<ITemplate>('Template', WhatsappTemplateSchema);
