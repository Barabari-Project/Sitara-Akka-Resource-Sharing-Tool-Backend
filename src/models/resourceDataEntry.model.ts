import mongoose, { Schema, Types } from "mongoose";
import collectionName from "../constants/collectionName";

export interface IResourceDataEntry extends Document {
    type: string;
    data: Types.ObjectId[]; // refs to SubData
    resourceId: Types.ObjectId; // back-ref to Resource
}

const ResourceDataEntrySchema = new Schema<IResourceDataEntry>({
    type: { type: String, required: true },
    data: {
        type: [Schema.Types.ObjectId],
        ref: collectionName.subData,
        default: []
    },
    resourceId: { type: Schema.Types.ObjectId, ref: collectionName.resource, required: true }
});

export const ResourceDataEntryModel = mongoose.model<IResourceDataEntry>(collectionName.resourceDataEntry, ResourceDataEntrySchema, collectionName.resourceDataEntry);
