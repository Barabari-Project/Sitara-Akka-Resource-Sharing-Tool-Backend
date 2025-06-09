import mongoose, { Schema, Types } from "mongoose";
import collectionName from "../constants/collectionName";

export interface IResourceItem extends Document {
    name: string;
    link: string;
    type: string;
    subDataId: Types.ObjectId; // back-ref to SubData
}

const ResourceItemSchema = new Schema<IResourceItem>({
    name: { type: String, required: true },
    link: { type: String, required: true },
    type: { type: String, required: true },
    subDataId: { type: Schema.Types.ObjectId, ref: collectionName.subData, required: true }
});

export const ResourceItemModel = mongoose.model<IResourceItem>(collectionName.resourceItem, ResourceItemSchema, collectionName.resourceItem);
