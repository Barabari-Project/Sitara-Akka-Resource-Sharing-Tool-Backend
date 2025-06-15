import mongoose, { Schema, Types } from "mongoose";
import collectionName from "../constants/collectionName";

export interface ISubData extends Document {
    name: string;
    datatype: 'link' | 'array' | 'file';
    link: string;
    data: Types.ObjectId[]; // refs to ResourceItem
    resourceDataEntryId: Types.ObjectId; // back-ref
}

const SubDataSchema = new Schema<ISubData>({
    name: { type: String, required: true },
    datatype: {
        type: String,
        enum: ['link', 'array', 'file'],
        required: true
    },
    link: {
        type: String,
    },
    data: {
        type: [Schema.Types.ObjectId],
        ref: collectionName.resourceItem,
        required: true,
        default: []
    },
    resourceDataEntryId: { type: Schema.Types.ObjectId, ref: collectionName.resourceDataEntry, required: true }
});

export const SubDataModel = mongoose.model<ISubData>(collectionName.subData, SubDataSchema, collectionName.subData);
