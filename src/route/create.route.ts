import { Router, Request, Response } from "express";
import { ResourceModel } from "../models/resource.model";
import { ResourceDataEntryModel } from "../models/resourceDataEntry.model";
import { SubDataModel } from "../models/subdata.model";
import { ResourceItemModel } from "../models/resourceItem.model";
import mongoose from "mongoose";
import expressAsyncHandler from "express-async-handler";
import createHttpError from "http-errors";

export const createRouter = Router();

// POST /resources - Create new resource with validation and duplicate check
createRouter.post('/resources', expressAsyncHandler(async (req: Request, res: Response) => {

    const { lan, class: className, subj } = req.body;

    // Validate required fields
    if (!lan || !className || !subj) {
        throw createHttpError(400, 'lan, class, and subj are required fields');
    }

    // Check for duplicate resource
    const existing = await ResourceModel.findOne({ lan, class: className, subj });
    if (existing) {
        throw createHttpError(409, 'Resource with same lan, class, and subj already exists');
    }

    // Create and save new resource
    const resource = new ResourceModel({
        lan,
        class: className,
        subj,
        data: []
    });

    await resource.save();

    res.status(201).json({ message: 'Resource created', resource });

}));


// POST /resource-data-entries
createRouter.post('/resource-data-entries', expressAsyncHandler(async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { type, resourceId } = req.body;

        // Validate: type
        if (!type || typeof type !== 'string' || type.trim() === '') {
            throw createHttpError(400, 'Field "type" is required and cannot be empty.');
        }

        // Validate: resourceId is valid ObjectId
        if (!resourceId || !mongoose.Types.ObjectId.isValid(resourceId)) {
            throw createHttpError(400, 'Valid "resourceId" is required.');
        }

        // Check resource existence
        const resourceExists = await ResourceModel.exists({ _id: resourceId });
        if (!resourceExists) {
            throw createHttpError(404, 'Resource with the given ID does not exist.');
        }

        // Check for duplicate type + resourceId combination
        const alreadyExists = await ResourceDataEntryModel.exists({ type: type.trim(), resourceId });
        if (alreadyExists) {
            throw createHttpError(409, 'ResourceDataEntry with this type already exists for the given resource.');
        }

        // Create and save
        const resourceEntry = new ResourceDataEntryModel({
            type: type.trim(),
            data: [],
            resourceId
        });

        await resourceEntry.save({ session });

        await ResourceModel.findByIdAndUpdate(
            resourceId,
            { $push: { data: resourceEntry._id } },
            { session }
        );

        await session.commitTransaction();
        res.status(201).json({ message: 'ResourceDataEntry created and linked', resourceEntry });
    } catch (err: any) {
        await session.abortTransaction();
        throw createHttpError(500, 'Failed to create ResourceDataEntry', err);
    } finally {
        session.endSession();
    }
}));


// POST /subdata
createRouter.post('/subdata', expressAsyncHandler(async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { name, datatype, link, resourceDataEntryId } = req.body;

        // Basic validation
        if (!name || typeof name !== 'string' || name.trim() === '') {
            throw createHttpError(400, '"name" is required and cannot be empty.');
        }

        if (!['string', 'array'].includes(datatype)) {
            throw createHttpError(400, '"datatype" must be either "string" or "array".');
        }

        if (!resourceDataEntryId || !mongoose.Types.ObjectId.isValid(resourceDataEntryId)) {
            throw createHttpError(400, 'Valid "resourceDataEntryId" is required.');
        }

        // Link requirement based on datatype
        if (datatype === 'string' && (!link || typeof link !== 'string' || link.trim() === '')) {
            throw createHttpError(400, '"link" is required when datatype is "string".');
        }

        if (datatype === 'array' && link) {
            throw createHttpError(400, '"link" must not be provided when datatype is "array".');
        }

        // Check if parent exists
        const entryExists = await ResourceDataEntryModel.exists({ _id: resourceDataEntryId });
        if (!entryExists) {
            throw createHttpError(404, 'Parent ResourceDataEntry not found.');
        }

        // Check for duplicate
        const duplicateQuery: any = {
            name: name.trim(),
            datatype,
            resourceDataEntryId
        };
        if (datatype === 'string') {
            duplicateQuery.link = link.trim();
        }

        const duplicate = await SubDataModel.exists(duplicateQuery);
        if (duplicate) {
            throw createHttpError(409, 'SubData with same name, datatype and link already exists under this entry.');
        }

        // Create and save
        const subData = new SubDataModel({
            name: name.trim(),
            datatype,
            link: datatype === 'string' ? link.trim() : '',
            data: [],
            resourceDataEntryId
        });

        await subData.save({ session });

        await ResourceDataEntryModel.findByIdAndUpdate(
            resourceDataEntryId,
            { $push: { data: subData._id } },
            { session }
        );

        await session.commitTransaction();
        res.status(201).json({ message: 'SubData created and linked', subData });
    } catch (err: any) {
        await session.abortTransaction();
        throw createHttpError(500, 'Failed to create SubData', err);
    } finally {
        session.endSession();
    }
}));

// POST /resource-items
createRouter.post('/resource-items', expressAsyncHandler(async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { name, link, type, subDataId } = req.body;

        // Validation: Required fields
        if (!name || typeof name !== 'string' || name.trim() === '') {
            throw createHttpError(400, '"name" is required and cannot be empty.');
        }

        if (!link || typeof link !== 'string' || link.trim() === '') {
            throw createHttpError(400, '"link" is required and cannot be empty.');
        }

        if (!type || typeof type !== 'string' || type.trim() === '') {
            throw createHttpError(400, '"type" is required and cannot be empty.');
        }

        if (!subDataId || !mongoose.Types.ObjectId.isValid(subDataId)) {
            throw createHttpError(400, 'Valid "subDataId" is required.');
        }

        // Check if subData exists
        const subDataExists = await SubDataModel.exists({ _id: subDataId });
        if (!subDataExists) {
            throw createHttpError(404, 'SubData with the given ID does not exist.');
        }

        // Check for duplicate
        const duplicate = await ResourceItemModel.exists({
            name: name.trim(),
            type: type.trim(),
            subDataId
        });

        if (duplicate) {
            throw createHttpError(409, 'ResourceItem with the same name, link, and type already exists under this SubData.');
        }

        // Create and link
        const resourceItem = new ResourceItemModel({
            name: name.trim(),
            link: link.trim(),
            type: type.trim(),
            subDataId
        });

        await resourceItem.save({ session });

        await SubDataModel.findByIdAndUpdate(
            subDataId,
            { $push: { data: resourceItem._id } },
            { session }
        );

        await session.commitTransaction();
        res.status(201).json({ message: 'ResourceItem created and linked', resourceItem });
    } catch (err: any) {
        await session.abortTransaction();
        throw createHttpError(500, 'Failed to create ResourceItem', err);
    } finally {
        session.endSession();
    }
}));