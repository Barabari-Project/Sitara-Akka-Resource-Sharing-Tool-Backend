import mongoose, { Document, Schema } from "mongoose";
import collectionName from "../constants/collectionName";

export enum DropDownType {
    SUBJECT = 'subject',
    CLASS = 'class',
    LANGUAGE = 'language'
}
export interface IDropDownData extends Document {
    type: DropDownType;
    value: string[];
}

const dropDownDataSchema = new Schema<IDropDownData>({
    type: {
        type: String,
        enum: {
            values: Object.values(DropDownType),
            message: 'Invalid config name'
        },
        required: [true, 'Name is required'],
        unique: true //
    },
    value: {
        type: [String],
        default: ['Other'],
        validate: {
            validator: (arr: string[]) => arr.every(v => typeof v === 'string'),
            message: 'All values must be strings'
        }
    }
}, { timestamps: true });

export const DropDownModel = mongoose.model<IDropDownData>(collectionName.dropDownData, dropDownDataSchema, collectionName.dropDownData);