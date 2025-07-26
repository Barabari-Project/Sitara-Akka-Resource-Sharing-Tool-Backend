import mongoose, { Schema } from "mongoose";
import collectionName from "../constants/collectionName";

export interface IResourceDataEntry extends Document {
    datatype: string;
    type: string;
    link: string;
    name:string;
    index:number;
}

const ResourceDataEntrySchema = new Schema<IResourceDataEntry>({
    datatype: {type:String,required:true},
    type: { type: String, required: true },
    name:{type:String,required:true},
    link: {type:String,required:true},
    index: {type:Number,required:true}
});

export const ResourceDataEntryModel = mongoose.model<IResourceDataEntry>(collectionName.resourceDataEntry, ResourceDataEntrySchema, collectionName.resourceDataEntry);
