import { Request, Response, Router } from "express";
import expressAsyncHandler from "express-async-handler";
import createHttpError from "http-errors";
import mongoose from "mongoose";
import { ResourceModel } from "../models/resource.model";
import { ResourceDataEntryModel } from "../models/resourceDataEntry.model";
import { ResourceItemModel } from "../models/resourceItem.model";
import { SubDataModel } from "../models/subdata.model";
import multer from "multer";
import { deleteFromS3, uploadToS3 } from "../utility/awsS3";

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

// PUT /resources/:id
createRouter.put('/resources/:id', expressAsyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { lan, class: className, subj } = req.body;

    if (!lan || !className || !subj) {
        throw createHttpError(400, 'lan, class, and subj are required fields');
    }

    // Check if resource exists
    const existingResource = await ResourceModel.findById(id);
    if (!existingResource) {
        throw createHttpError(404, 'Resource not found');
    }

    // Check for duplicate (excluding current)
    const duplicate = await ResourceModel.findOne({
        _id: { $ne: id },
        lan,
        class: className,
        subj
    });

    if (duplicate) {
        throw createHttpError(409, 'Another resource with same lan, class, and subj exists');
    }

    // Update fields
    existingResource.lan = lan;
    existingResource.class = className;
    existingResource.subj = subj;

    await existingResource.save();

    res.status(200).json({ message: 'Resource updated', resource: existingResource });
}));

// DELETE /resources/:id
createRouter.delete('/resources/:id', expressAsyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const resource = await ResourceModel.findById(id);

    if (!resource) {
        throw createHttpError(404, 'Resource not found');
    }

    if (resource.data.length > 0) {
        throw createHttpError(400, 'Cannot delete resource with linked data entries');
    }

    await ResourceModel.findByIdAndDelete(id);

    res.status(200).json({ message: 'Resource deleted successfully' });
}));

// POST /resource-data-entries
createRouter.post('/resource-data-entries', expressAsyncHandler(async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();


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
    try {
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
        throw err;
    } finally {
        session.endSession();
    }
}));

// PUT /resource-data-entries/:id
createRouter.put('/resource-data-entries/:id', expressAsyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { type, resourceId } = req.body;

    if (!type || typeof type !== 'string' || type.trim() === '') {
        throw createHttpError(400, 'Field "type" is required and cannot be empty.');
    }

    if (!resourceId || !mongoose.Types.ObjectId.isValid(resourceId)) {
        throw createHttpError(400, 'Valid "resourceId" is required.');
    }

    const resourceExists = await ResourceModel.exists({ _id: resourceId });
    if (!resourceExists) {
        throw createHttpError(404, 'Resource not found.');
    }

    const entry = await ResourceDataEntryModel.findById(id);
    if (!entry) {
        throw createHttpError(404, 'ResourceDataEntry not found.');
    }

    // Check uniqueness for new (type + resourceId) combo
    const duplicate = await ResourceDataEntryModel.findOne({
        _id: { $ne: id },
        type: type.trim(),
        resourceId
    });
    if (duplicate) {
        throw createHttpError(409, 'Another entry with the same type already exists for this resource.');
    }

    // Update fields
    entry.type = type.trim();

    await entry.save();
    res.status(200).json({ message: 'ResourceDataEntry updated', entry });
}));


// DELETE /resource-data-entries/:id
createRouter.delete('/resource-data-entries/:id', expressAsyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const entry = await ResourceDataEntryModel.findById(id);
    if (!entry) {
        throw createHttpError(404, 'ResourceDataEntry not found.');
    }

    if (entry.data.length > 0) {
        throw createHttpError(400, 'Cannot delete: linked SubData still exists.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Remove ref from parent Resource
        await ResourceModel.findByIdAndUpdate(
            entry.resourceId,
            { $pull: { data: entry._id } },
            { session }
        );

        await ResourceDataEntryModel.findByIdAndDelete(entry._id, { session });

        await session.commitTransaction();
        res.status(200).json({ message: 'ResourceDataEntry deleted successfully' });
    } catch (err: any) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}));


// TODO: set file size limit understand multer config

// Multer config
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /subdata
createRouter.post('/subdata', upload.single('file'), expressAsyncHandler(async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();


    const { name, datatype, resourceDataEntryId } = req.body;
    const file = (req as any).file;

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

    let link = '';

    if (datatype === 'string') {
        if (!file) {
            throw createHttpError(400, '"file" must be provided when datatype is "string".');
        }
    }

    if (datatype === 'array' && link) {
        throw createHttpError(400, '"link" must not be provided when datatype is "array".');
    }

    // Check if parent exists
    const entryExists = await ResourceDataEntryModel.exists({ _id: resourceDataEntryId });
    if (!entryExists) {
        throw createHttpError(404, 'Parent ResourceDataEntry not found.');
    }
    const subDataExists = await SubDataModel.exists({ name: name.trim(), datatype, resourceDataEntryId });
    if (subDataExists) {
        throw createHttpError(409, 'SubData with same name, datatype and link already exists under this entry.');
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
        data: [],
        resourceDataEntryId
    });

    try {
        const updatedResourceEntry = await ResourceDataEntryModel.findByIdAndUpdate(
            resourceDataEntryId,
            { $push: { data: subData._id } },
            { session }
        );
        if (file) {
            subData.link = `${updatedResourceEntry?.resourceId}/${resourceDataEntryId}/${subData._id}`;
        }
        await subData.save({ session });

        // Upload to S3
        if (file) {
            await uploadToS3(file.buffer, subData.link, file.mimetype);
        }

        await session.commitTransaction();
        res.status(201).json({ message: 'SubData created and linked', subData });
    } catch (err: any) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}));

createRouter.put('/subdata/:id', upload.single('file'), expressAsyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, datatype, resourceDataEntryId } = req.body;
    const file = (req as any).file;

    const session = await mongoose.startSession();
    session.startTransaction();


    if (!name || typeof name !== 'string' || name.trim() === '') {
        throw createHttpError(400, '"name" is required and cannot be empty.');
    }

    if (!['string', 'array'].includes(datatype)) {
        throw createHttpError(400, '"datatype" must be either "string" or "array".');
    }

    if (!resourceDataEntryId || !mongoose.Types.ObjectId.isValid(resourceDataEntryId)) {
        throw createHttpError(400, 'Valid "resourceDataEntryId" is required.');
    }

    const existingSubData = await SubDataModel.findById(id);
    if (!existingSubData) {
        throw createHttpError(404, 'SubData not found.');
    }

    const parentEntry = await ResourceDataEntryModel.findById(resourceDataEntryId);
    if (!parentEntry) {
        throw createHttpError(404, 'Parent ResourceDataEntry not found.');
    }
    
    if (datatype === 'array' && file) {
        throw createHttpError(400, '"file" must not be provided when datatype is "array".');
    }

    // Check for duplicate on (name, datatype, resourceDataEntryId, link)
    const duplicateQuery: any = {
        _id: { $ne: id },
        name: name.trim(),
        datatype,
        resourceDataEntryId
    };

    if (datatype === 'string') {
        duplicateQuery.link = `${parentEntry.resourceId}/${resourceDataEntryId}/${id}`;
    }

    const duplicate = await SubDataModel.findOne(duplicateQuery);
    if (duplicate) {
        throw createHttpError(409, 'Duplicate SubData with the same name, datatype and link exists.');
    }

    // Update fields
    existingSubData.name = name.trim();
    existingSubData.datatype = datatype;

    if (datatype === 'string') {
        if (existingSubData.data.length > 0) {
            throw createHttpError(400, 'Cannot update: linked ResourceItem still exists.');
        }
        const newLink = `${parentEntry.resourceId}/${resourceDataEntryId}/${id}`;
        existingSubData.link = newLink;
    } else {
        existingSubData.link = '';
    }

    try {
        await existingSubData.save({ session });
        if (file) {
            await uploadToS3(file.buffer, existingSubData.link, file.mimetype);
        }

        await session.commitTransaction();
        res.status(200).json({ message: 'SubData updated successfully', subData: existingSubData });
    } catch (err: any) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}));

createRouter.delete('/subdata/:id', expressAsyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();


    const subData = await SubDataModel.findById(id);
    if (!subData) {
        throw createHttpError(404, 'SubData not found.');
    }

    if (subData.data.length > 0) {
        throw createHttpError(400, 'Cannot delete SubData that has linked ResourceItems.');
    }
    try {
        // Remove ref from parent
        await ResourceDataEntryModel.findByIdAndUpdate(
            subData.resourceDataEntryId,
            { $pull: { data: subData._id } },
            { session }
        );

        await SubDataModel.findByIdAndDelete(subData._id, { session });

        // Optionally delete S3 file if it exists
        if (subData.link) {
            await deleteFromS3(subData.link);
        }

        await session.commitTransaction();
        res.status(200).json({ message: 'SubData deleted successfully' });
    } catch (err: any) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}));



// POST /resource-items
createRouter.post('/resource-items', upload.single('file'), expressAsyncHandler(async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();


    const { name, type, subDataId } = req.body;
    const file = (req as any).file;

    // Validation: Required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
        throw createHttpError(400, '"name" is required and cannot be empty.');
    }

    if (!file) {
        throw createHttpError(400, '"file" is required and cannot be empty.');
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

    try {
        // Create and link
        const resourceItem = new ResourceItemModel({
            name: name.trim(),
            type: type.trim(),
            subDataId
        });


        const updatedSubData = await SubDataModel.findByIdAndUpdate(
            subDataId,
            { $push: { data: resourceItem._id } },
            { session }
        ).populate({
            path: 'resourceDataEntryId',
            select: 'resourceId _id'
        });

        if (!updatedSubData?.resourceDataEntryId) {
            throw createHttpError(404, 'Failed to populate resourceDataEntryId');
        }

        const resourceDataEntry = updatedSubData.resourceDataEntryId as any;
        resourceItem.link = `${resourceDataEntry.resourceId}/${resourceDataEntry._id}/${updatedSubData._id}/${resourceItem._id}`;

        await resourceItem.save({ session });
        if (file) {
            await uploadToS3(file.buffer, resourceItem.link, file.mimetype);
        }
        await session.commitTransaction();
        res.status(201).json({ message: 'ResourceItem created and linked', resourceItem });
    } catch (err: any) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}));

createRouter.put('/resource-items/:id', upload.single('file'), expressAsyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, type, subDataId } = req.body;
    const file = (req as any).file;

    const session = await mongoose.startSession();
    session.startTransaction();


    // Validate ID and required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
        throw createHttpError(400, '"name" is required and cannot be empty.');
    }

    if (!type || typeof type !== 'string' || type.trim() === '') {
        throw createHttpError(400, '"type" is required and cannot be empty.');
    }

    if (!subDataId || !mongoose.Types.ObjectId.isValid(subDataId)) {
        throw createHttpError(400, 'Valid "subDataId" is required.');
    }

    const existingItem = await ResourceItemModel.findById(id);
    if (!existingItem) {
        throw createHttpError(404, 'ResourceItem not found.');
    }

    const subData = await SubDataModel.findById(subDataId).populate({
        path: 'resourceDataEntryId',
        select: 'resourceId'
    });

    if (!subData || !subData.resourceDataEntryId) {
        throw createHttpError(404, 'Linked SubData or its parent entry not found.');
    }

    try {
        // Check for duplicate
        const duplicate = await ResourceItemModel.findOne({
            _id: { $ne: id },
            name: name.trim(),
            type: type.trim(),
            subDataId
        });

        if (duplicate) {
            throw createHttpError(409, 'Another ResourceItem with same name and type exists under this SubData.');
        }

        // Update values
        existingItem.name = name.trim();
        existingItem.type = type.trim();

        // Construct new S3 link and upload if file provided
        const resourceDataEntry: any = subData.resourceDataEntryId;
        existingItem.link = `${resourceDataEntry.resourceId}/${resourceDataEntry._id}/${subData._id}/${id}`;

        await existingItem.save({ session });

        if (file) {
            await uploadToS3(file.buffer, existingItem.link, file.mimetype);
        }


        await session.commitTransaction();
        res.status(200).json({ message: 'ResourceItem updated successfully', resourceItem: existingItem });
    } catch (err:any) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}));


createRouter.delete('/resource-items/:id', expressAsyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();

    const item = await ResourceItemModel.findById(id);
    if (!item) {
        throw createHttpError(404, 'ResourceItem not found.');
    }

    try {

        // Remove from parent subData
        await SubDataModel.findByIdAndUpdate(
            item.subDataId,
            { $pull: { data: item._id } },
            { session }
        );

        // Delete ResourceItem
        await ResourceItemModel.findByIdAndDelete(item._id, { session });

        // Delete from S3 if file exists
        if (item.link) {
            await deleteFromS3(item.link);
        }

        await session.commitTransaction();
        res.status(200).json({ message: 'ResourceItem deleted successfully' });
    } catch (err: any) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}));
