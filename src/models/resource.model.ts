import mongoose, { Schema, Types } from "mongoose";
import collectionName from "../constants/collectionName";

export interface IResource extends Document {
    lan: string;
    class: string;
    subj: string;
    data: Types.ObjectId[]; // refs to ResourceDataEntry
}

const ResourceSchema = new Schema<IResource>({
    lan: { type: String, required: true },
    class: { type: String, required: true },
    subj: { type: String, required: true },
    data: {
        type: [Schema.Types.ObjectId],
        ref: collectionName.resourceDataEntry,
        default: []
    }
});

export const ResourceModel = mongoose.model<IResource>(collectionName.resource, ResourceSchema, collectionName.resource);
