import { Request, Response, Router } from 'express';
import expressAsyncHandler from 'express-async-handler';
import createHttpError from 'http-errors';
import mongoose from 'mongoose';
import { authMiddleware, UserRoles } from '../middleware/auth.middleware';
import { ExpiringMediaModel } from '../models/expiringMedia.model';
import { ResourceModel } from '../models/resource.model';
import { ResourceDataEntryModel } from '../models/resourceDataEntry.model';
import { ResourceItemModel } from '../models/resourceItem.model';
import { SubDataModel } from '../models/subdata.model';
import { sendMediaToWhatsApp } from '../utility/wp';
import { DropDownModel, DropDownType } from '../models/dropDown.model';

export const getRouter = Router();

// GET unique languages
getRouter.get('/resources/languages', expressAsyncHandler(async (req: Request, res: Response) => {
    const languages = await ResourceModel.distinct('lan');
    res.status(200).json({ languages });
}));


// GET unique subjects based on language
getRouter.get('/resources/subjects', expressAsyncHandler(async (req: Request, res: Response) => {
    const { lan } = req.query;
    if (!lan || typeof lan !== 'string') {
        throw createHttpError(400, 'Query param "lan" is required and must be a string.');
    }
    const resources = await ResourceModel.find({ lan }).select('-data -__v');
    res.status(200).json({ resources });
}));

// {
//   "resources": [
//     { "subj": "Math", "types": ["pdf", "video"] },
//     { "subj": "English", "types": ["audio", "pdf"] }
//   ]
// }
getRouter.get('/resources/subjects/v1', expressAsyncHandler(async (req: Request, res: Response) => {
    const { lan } = req.query;
    if (!lan || typeof lan !== 'string') {
        throw createHttpError(400, 'Query param "lan" is required and must be a string.');
    }

    // Step 1: Fetch all resources for the given language
    const resources = await ResourceModel.find({ lan }).populate({
        path: 'data',
        select: 'type'
    });

    // Step 2: Map subj -> Set of types
    const subjTypeMap: Record<string, Set<string>> = {};

    for (const resource of resources) {
        const subject = resource.subj;
        if (!subjTypeMap[subject]) {
            subjTypeMap[subject] = new Set();
        }

        resource.data.forEach((entry: any) => {
            if (entry?.type) {
                subjTypeMap[subject].add(entry.type);
            }
        });
    }

    // Step 3: Convert to desired response format
    const response = Object.entries(subjTypeMap).map(([subj, types]) => ({
        subj,
        types: Array.from(types)
    }));

    res.status(200).json({ resources: response });
}));

getRouter.get('/resources/data/v1', expressAsyncHandler(async (req: Request, res: Response) => {
    const { resourceId, type } = req.query;

    if (!resourceId || typeof resourceId !== 'string' || !mongoose.Types.ObjectId.isValid(resourceId)) {
        throw createHttpError(400, 'Valid query param "resourceId" is required.');
    }

    if (!type || typeof type !== 'string') {
        throw createHttpError(400, 'Query param "type" is required and must be a string.');
    }

    // Step 1: Find the resource by ID and populate its data
    const resource = await ResourceModel.findById(resourceId).populate({
        path: 'data',
        match: { type },
        select: '-__v'
    });

    if (!resource) {
        throw createHttpError(404, 'Resource not found.');
    }

    // Step 2: Return filtered resource data entries
    res.status(200).json({ data: resource.data });
}));



// GET all resource data entries for a given resourceId
getRouter.get('/resource-data-entries/:resourceId', expressAsyncHandler(async (req: Request, res: Response) => {
    const { resourceId } = req.params;
    const entries = await ResourceDataEntryModel.find({ resourceId });
    res.status(200).json({ entries });
}));

// GET all subdata entries for a given resourceDataEntryId
getRouter.get('/subdata/:resourceDataEntryId', expressAsyncHandler(async (req: Request, res: Response) => {
    const { resourceDataEntryId } = req.params;
    const subData = await SubDataModel.find({ resourceDataEntryId }).select('-data -__v -resourceDataEntryId ').lean();
    for (const sub of subData) {
        if (sub.datatype === 'file') {
            sub.link = '';
        }
    }
    res.status(200).json({ subData });
}));

getRouter.get('/resource-items/:subDataId', expressAsyncHandler(async (req: Request, res: Response) => {
    const { subDataId } = req.params;
    const items = await ResourceItemModel.find({ subDataId }).select('-subDataId -__v').lean();
    for (const item of items) {
        if (item.type === 'file') {
            item.link = '';
        }
    }
    res.status(200).json({ items });
}));


// GET resource item link by ID
getRouter.get('/resource-items/link/:id', authMiddleware([UserRoles.ADMIN, UserRoles.USER]), expressAsyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw createHttpError(400, 'Invalid ID');
    }

    const item = await ResourceItemModel.findById(id).select('type link');

    if (!item || item.type !== 'file' || !item.link) {
        throw createHttpError(404, 'Resource item not found');
    }


    const media = await ExpiringMediaModel.findById(id);
    if (!media) {
        throw createHttpError(404, 'Internal server error. Please try again later.');
    } else {
        await sendMediaToWhatsApp(media.mediaId, (req as any).phoneNumber, media.mimeType);
    }
    res.status(200).json({ message: 'Media sent successfully' });
}));

// GET SubData's data array by SubData ID
getRouter.get('/subdata/link/:id', authMiddleware([UserRoles.ADMIN, UserRoles.USER]), expressAsyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const subData = await SubDataModel.findById(id).select('datatype link');

    if (!subData || subData.datatype !== 'file' || !subData.link) {
        throw createHttpError(404, 'SubData not found');
    }

    const media = await ExpiringMediaModel.findById(id);

    if (!media) {
        throw createHttpError(404, 'Internal server error. Please try again later.');
    } else {
        await sendMediaToWhatsApp(media.mediaId, (req as any).phoneNumber, media.mimeType);
    }
    res.status(200).json({ message: 'Media sent successfully' });
}));


getRouter.get('/dropdown-data', expressAsyncHandler(async (req: Request, res: Response) => {
    const { type } = req.query;
    if (!type || typeof type !== 'string') {
        throw createHttpError(400, 'Query param "type" is required and must be a string.');
    }
    if (!Object.values(DropDownType).includes(type as DropDownType)) {
        throw createHttpError(400, 'Invalid dropdown type');
    }
    const dropdownData = await DropDownModel.find({ type }).select('type value');
    res.status(200).json({ dropdownData });
}));