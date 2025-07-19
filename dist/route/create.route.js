"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRouter = void 0;
const express_1 = require("express");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const http_errors_1 = __importDefault(require("http-errors"));
const mongoose_1 = __importDefault(require("mongoose"));
const resource_model_1 = require("../models/resource.model");
const resourceDataEntry_model_1 = require("../models/resourceDataEntry.model");
const resourceItem_model_1 = require("../models/resourceItem.model");
const subdata_model_1 = require("../models/subdata.model");
const multer_1 = __importDefault(require("multer"));
const awsS3_1 = require("../utility/awsS3");
const expiringMedia_model_1 = require("../models/expiringMedia.model");
exports.createRouter = (0, express_1.Router)();
// POST /resources - Create new resource with validation and duplicate check
exports.createRouter.post('/resources', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { lan, class: className, subj } = req.body;
    // Validate required fields
    if (!lan || !className || !subj) {
        throw (0, http_errors_1.default)(400, 'lan, class, and subj are required fields');
    }
    // Check for duplicate resource
    const existing = yield resource_model_1.ResourceModel.findOne({ lan, class: className, subj });
    if (existing) {
        throw (0, http_errors_1.default)(409, 'Subject with same lan, class, and subj already exists');
    }
    // Create and save new resource
    const resource = new resource_model_1.ResourceModel({
        lan,
        class: className,
        subj,
        data: []
    });
    yield resource.save();
    res.status(201).json({ message: 'Subject created', resource });
})));
// PUT /resources/:id
exports.createRouter.put('/resources/:id', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { lan, class: className, subj } = req.body;
    if (!lan || !className || !subj) {
        throw (0, http_errors_1.default)(400, 'lan, class, and subj are required fields');
    }
    // Check if resource exists
    const existingResource = yield resource_model_1.ResourceModel.findById(id);
    if (!existingResource) {
        throw (0, http_errors_1.default)(404, 'Resource not found');
    }
    // Check for duplicate (excluding current)
    const duplicate = yield resource_model_1.ResourceModel.findOne({
        _id: { $ne: id },
        lan,
        class: className,
        subj
    });
    if (duplicate) {
        throw (0, http_errors_1.default)(409, 'Another resource with same lan, class, and subj exists');
    }
    // Update fields
    existingResource.lan = lan;
    existingResource.class = className;
    existingResource.subj = subj;
    yield existingResource.save();
    res.status(200).json({ message: 'Resource updated', resource: existingResource });
})));
// DELETE /resources/:id
exports.createRouter.delete('/resources/:id', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const resource = yield resource_model_1.ResourceModel.findById(id);
    if (!resource) {
        throw (0, http_errors_1.default)(404, 'Subject not found');
    }
    if (resource.data.length > 0) {
        throw (0, http_errors_1.default)(400, 'Cannot delete Subject with linked data entries');
    }
    yield resource_model_1.ResourceModel.findByIdAndDelete(id);
    res.status(200).json({ message: 'Subject deleted successfully' });
})));
// POST /resource-data-entries
exports.createRouter.post('/resource-data-entries', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    const { type, resourceId } = req.body;
    // Validate: type
    if (!type || typeof type !== 'string' || type.trim() === '') {
        throw (0, http_errors_1.default)(400, 'Field "type" is required and cannot be empty.');
    }
    // Validate: resourceId is valid ObjectId
    if (!resourceId || !mongoose_1.default.Types.ObjectId.isValid(resourceId)) {
        throw (0, http_errors_1.default)(400, 'Valid "resourceId" is required.');
    }
    // Check resource existence
    const resourceExists = yield resource_model_1.ResourceModel.exists({ _id: resourceId });
    if (!resourceExists) {
        throw (0, http_errors_1.default)(404, 'Resource with the given ID does not exist.');
    }
    // Check for duplicate type + resourceId combination
    const alreadyExists = yield resourceDataEntry_model_1.ResourceDataEntryModel.exists({ type: type.trim(), resourceId });
    if (alreadyExists) {
        throw (0, http_errors_1.default)(409, 'ResourceDataEntry with this type already exists for the given resource.');
    }
    try {
        // Create and save
        const resourceEntry = new resourceDataEntry_model_1.ResourceDataEntryModel({
            type: type.trim(),
            data: [],
            resourceId
        });
        yield resourceEntry.save({ session });
        yield resource_model_1.ResourceModel.findByIdAndUpdate(resourceId, { $push: { data: resourceEntry._id } }, { session });
        yield session.commitTransaction();
        res.status(201).json({ message: 'ResourceDataEntry created and linked', resourceEntry });
    }
    catch (err) {
        yield session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
})));
// PUT /resource-data-entries/:id
exports.createRouter.put('/resource-data-entries/:id', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { type, resourceId } = req.body;
    if (!type || typeof type !== 'string' || type.trim() === '') {
        throw (0, http_errors_1.default)(400, 'Field "type" is required and cannot be empty.');
    }
    if (!resourceId || !mongoose_1.default.Types.ObjectId.isValid(resourceId)) {
        throw (0, http_errors_1.default)(400, 'Valid "resourceId" is required.');
    }
    const resourceExists = yield resource_model_1.ResourceModel.exists({ _id: resourceId });
    if (!resourceExists) {
        throw (0, http_errors_1.default)(404, 'Resource not found.');
    }
    const entry = yield resourceDataEntry_model_1.ResourceDataEntryModel.findById(id);
    if (!entry) {
        throw (0, http_errors_1.default)(404, 'ResourceDataEntry not found.');
    }
    // Check uniqueness for new (type + resourceId) combo
    const duplicate = yield resourceDataEntry_model_1.ResourceDataEntryModel.findOne({
        _id: { $ne: id },
        type: type.trim(),
        resourceId
    });
    if (duplicate) {
        throw (0, http_errors_1.default)(409, 'Another entry with the same type already exists for this resource.');
    }
    // Update fields
    entry.type = type.trim();
    yield entry.save();
    res.status(200).json({ message: 'ResourceDataEntry updated', entry });
})));
exports.createRouter.put('/resource-data-entries/data/v1/:id', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { type, name, link, resourceId } = req.body;
    if (!type || typeof type !== 'string' || type.trim() === '') {
        throw (0, http_errors_1.default)(400, 'Field "type" is required and cannot be empty.');
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
        throw (0, http_errors_1.default)(400, 'Field "name" is required and cannot be empty.');
    }
    if (!resourceId || !mongoose_1.default.Types.ObjectId.isValid(resourceId)) {
        throw (0, http_errors_1.default)(400, 'Valid "resourceId" is required.');
    }
    // Step 1: Check if the resource exists
    const resourceExists = yield resource_model_1.ResourceModel.exists({ _id: resourceId });
    if (!resourceExists) {
        throw (0, http_errors_1.default)(404, 'Resource not found.');
    }
    // Step 2: Find the entry to update
    const entry = yield resourceDataEntry_model_1.ResourceDataEntryModel.findById(id);
    if (!entry) {
        throw (0, http_errors_1.default)(404, 'ResourceDataEntry not found.');
    }
    // Step 3: Check uniqueness for new (type + resourceId) combo
    const duplicate = yield resourceDataEntry_model_1.ResourceDataEntryModel.findOne({
        _id: { $ne: id },
        type: type.trim(),
        resourceId,
    });
    if (duplicate) {
        throw (0, http_errors_1.default)(409, 'Another entry with the same type already exists for this resource.');
    }
    // Step 4: Update fields
    entry.type = type.trim();
    entry.name = name.trim();
    if (link && typeof link === 'string') {
        entry.link = link.trim(); // Optional field
    }
    yield entry.save();
    res.status(200).json({ message: '✅ ResourceDataEntry updated successfully', entry });
})));
// DELETE /resource-data-entries/:id
exports.createRouter.delete('/resource-data-entries/:id', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { resourceId } = req.query;
    const entry = yield resourceDataEntry_model_1.ResourceDataEntryModel.findById(id);
    if (!entry) {
        throw (0, http_errors_1.default)(404, 'ResourceDataEntry not found.');
    }
    // if (entry.data.length > 0) {
    //     throw createHttpError(400, 'Cannot delete: linked SubData still exists.');
    // }
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        // Remove ref from parent Resource
        yield resource_model_1.ResourceModel.findByIdAndUpdate(resourceId, { $pull: { data: entry._id } }, { session });
        yield resourceDataEntry_model_1.ResourceDataEntryModel.findByIdAndDelete(entry._id, { session });
        yield expiringMedia_model_1.ExpiringMediaModel.findByIdAndDelete(entry._id, { session });
        yield session.commitTransaction();
        res.status(200).json({ message: 'ResourceDataEntry deleted successfully' });
    }
    catch (err) {
        yield session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
})));
// TODO: set file size limit understand multer config
// understand proper flow of multer
// what if AWS file deletion didn't succeed
// Multer config
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
exports.createRouter.post('/resources/data/v1', upload.single('file'), (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { type, name, link, resourceId } = req.body;
        const file = req.file;
        if (!type || !name || !resourceId) {
            throw (0, http_errors_1.default)(400, 'Fields "type", "name", and "resourceId" are required.');
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(resourceId)) {
            throw (0, http_errors_1.default)(400, 'Invalid "resourceId".');
        }
        const resource = yield resource_model_1.ResourceModel.findById(resourceId).session(session);
        if (!resource) {
            throw (0, http_errors_1.default)(404, 'Resource not found.');
        }
        let finalLink;
        let datatype = '';
        const newEntry = new resourceDataEntry_model_1.ResourceDataEntryModel({
            datatype,
            type,
            name,
            link: 'placeholder',
        });
        if (link) {
            finalLink = link;
            datatype = 'link';
        }
        else if (file && file.buffer) {
            finalLink = `${resource._id}/${newEntry._id}`;
            datatype = 'file';
        }
        else {
            throw (0, http_errors_1.default)(400, 'Either "link" or "file" must be provided.');
        }
        newEntry.datatype = datatype;
        newEntry.link = finalLink;
        // Save entries inside the transaction
        yield newEntry.save({ session });
        resource.data.push(newEntry._id);
        yield resource.save({ session });
        // Upload to S3 (if it's a file)
        if (datatype === 'file') {
            yield (0, awsS3_1.uploadToS3)(file.buffer, finalLink, file.mimetype);
            yield (0, awsS3_1.uploadFileToWhatsApp)(finalLink, name, newEntry._id);
        }
        // ✅ Commit only after everything succeeds
        yield session.commitTransaction();
        session.endSession();
        res.status(201).json({
            message: 'Resource data entry created.',
            data: newEntry,
        });
    }
    catch (err) {
        yield session.abortTransaction();
        session.endSession();
        console.error('Transaction failed:', err);
        throw err;
    }
})));
// POST /subdata
exports.createRouter.post('/subdata', upload.single('file'), (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    const { name, datatype, resourceDataEntryId, link } = req.body;
    const file = req.file;
    // Basic validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
        throw (0, http_errors_1.default)(400, '"name" is required and cannot be empty.');
    }
    if (!['link', 'array', 'file'].includes(datatype)) {
        throw (0, http_errors_1.default)(400, '"datatype" must be either "link" or "array" or "file".');
    }
    if (!resourceDataEntryId || !mongoose_1.default.Types.ObjectId.isValid(resourceDataEntryId)) {
        throw (0, http_errors_1.default)(400, 'Valid "resourceDataEntryId" is required.');
    }
    if (datatype === 'file') {
        if (!file) {
            throw (0, http_errors_1.default)(400, '"file" must be provided when datatype is "file".');
        }
    }
    else if (file) {
        throw (0, http_errors_1.default)(400, '"file" must not be provided when datatype is not "file".');
    }
    if (datatype === 'link') {
        if (!link) {
            throw (0, http_errors_1.default)(400, '"link" must be provided when datatype is "link".');
        }
    }
    else if (link) {
        throw (0, http_errors_1.default)(400, '"link" must not be provided when datatype is not "link".');
    }
    // Check if parent exists
    const entryExists = yield resourceDataEntry_model_1.ResourceDataEntryModel.exists({ _id: resourceDataEntryId });
    if (!entryExists) {
        throw (0, http_errors_1.default)(404, 'Parent ResourceDataEntry not found.');
    }
    const subDataExists = yield subdata_model_1.SubDataModel.exists({ name: name.trim(), datatype, resourceDataEntryId });
    if (subDataExists) {
        throw (0, http_errors_1.default)(409, 'SubData with same name, datatype and link already exists under this entry.');
    }
    // Check for duplicate
    const duplicateQuery = {
        name: name.trim(),
        datatype,
        resourceDataEntryId
    };
    if (datatype === 'link') {
        duplicateQuery.link = link.trim();
    }
    const duplicate = yield subdata_model_1.SubDataModel.exists(duplicateQuery);
    if (duplicate) {
        throw (0, http_errors_1.default)(409, 'SubData with same name, datatype and link already exists under this entry.');
    }
    // Create and save
    const subData = new subdata_model_1.SubDataModel({
        name: name.trim(),
        datatype,
        data: [],
        resourceDataEntryId
    });
    try {
        const updatedResourceEntry = yield resourceDataEntry_model_1.ResourceDataEntryModel.findByIdAndUpdate(resourceDataEntryId, { $push: { data: subData._id } }, { session });
        // if (file) {
        //     subData.link = `${updatedResourceEntry?.resourceId}/${resourceDataEntryId}/${subData._id}`;
        // } else if (datatype === 'link') {
        //     subData.link = link.trim();
        // }
        yield subData.save({ session });
        // Upload to S3
        if (datatype === 'file') {
            yield (0, awsS3_1.uploadToS3)(file.buffer, subData.link, file.mimetype);
        }
        yield session.commitTransaction();
        res.status(201).json({ message: 'SubData created and linked', subData });
    }
    catch (err) {
        yield session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
})));
exports.createRouter.put('/subdata/:id', upload.single('file'), (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, datatype, resourceDataEntryId, link } = req.body;
    const file = req.file;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    if (!name || typeof name !== 'string' || name.trim() === '') {
        throw (0, http_errors_1.default)(400, '"name" is required and cannot be empty.');
    }
    if (!['link', 'array', 'file'].includes(datatype)) {
        throw (0, http_errors_1.default)(400, '"datatype" must be either "link" or "array" or "file".');
    }
    if (datatype === 'link') {
        if (!link) {
            throw (0, http_errors_1.default)(400, '"link" must be provided when datatype is "link".');
        }
    }
    else if (link) {
        throw (0, http_errors_1.default)(400, '"link" must not be provided when datatype is not "link".');
    }
    if (datatype !== 'file' && file) {
        throw (0, http_errors_1.default)(400, '"file" must not be provided when datatype is not "file".');
    }
    if (!resourceDataEntryId || !mongoose_1.default.Types.ObjectId.isValid(resourceDataEntryId)) {
        throw (0, http_errors_1.default)(400, 'Valid "resourceDataEntryId" is required.');
    }
    const existingSubData = yield subdata_model_1.SubDataModel.findById(id);
    if (!existingSubData) {
        throw (0, http_errors_1.default)(404, 'SubData not found.');
    }
    const parentEntry = yield resourceDataEntry_model_1.ResourceDataEntryModel.findById(resourceDataEntryId);
    if (!parentEntry) {
        throw (0, http_errors_1.default)(404, 'Parent ResourceDataEntry not found.');
    }
    // Check for duplicate on (name, datatype, resourceDataEntryId, link)
    const duplicateQuery = {
        _id: { $ne: id },
        name: name.trim(),
        datatype,
        resourceDataEntryId
    };
    // if (datatype === 'link') {
    //     duplicateQuery.link = link.trim();
    // } else if (datatype === 'file') {
    //     duplicateQuery.link = `${parentEntry.resourceId}/${resourceDataEntryId}/${id}`;
    // }
    const duplicate = yield subdata_model_1.SubDataModel.findOne(duplicateQuery);
    if (duplicate) {
        throw (0, http_errors_1.default)(409, 'Duplicate SubData with the same name, datatype and link exists.');
    }
    // Update fields
    existingSubData.name = name.trim();
    existingSubData.datatype = datatype;
    if (datatype === 'link' || datatype === 'file') {
        // if (existingSubData.data.length > 0) {
        //     throw createHttpError(400, 'Cannot update: linked ResourceItem still exists.');
        // }
        // if (datatype === 'link') {
        //     existingSubData.link = link.trim();
        // } else if (datatype === 'file') {
        //     existingSubData.link = `${parentEntry.resourceId}/${resourceDataEntryId}/${id}`;
        // }
    }
    else {
        existingSubData.link = '';
    }
    try {
        yield existingSubData.save({ session });
        if (file) {
            yield (0, awsS3_1.uploadToS3)(file.buffer, existingSubData.link, file.mimetype);
        }
        yield session.commitTransaction();
        res.status(200).json({ message: 'SubData updated successfully', subData: existingSubData });
    }
    catch (err) {
        yield session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
})));
exports.createRouter.delete('/subdata/:id', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    const subData = yield subdata_model_1.SubDataModel.findById(id);
    if (!subData) {
        throw (0, http_errors_1.default)(404, 'SubData not found.');
    }
    if (subData.data.length > 0) {
        throw (0, http_errors_1.default)(400, 'Cannot delete SubData that has linked ResourceItems.');
    }
    try {
        // Remove ref from parent
        yield resourceDataEntry_model_1.ResourceDataEntryModel.findByIdAndUpdate(subData.resourceDataEntryId, { $pull: { data: subData._id } }, { session });
        yield subdata_model_1.SubDataModel.findByIdAndDelete(subData._id, { session });
        // Optionally delete S3 file if it exists
        if (subData.link) {
            yield (0, awsS3_1.deleteFromS3)(subData.link);
        }
        yield session.commitTransaction();
        res.status(200).json({ message: 'SubData deleted successfully' });
    }
    catch (err) {
        yield session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
})));
// POST /resource-items
exports.createRouter.post('/resource-items', upload.single('file'), (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    const { name, type, subDataId, link, icon } = req.body;
    const file = req.file;
    // Validation: Required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
        throw (0, http_errors_1.default)(400, '"name" is required and cannot be empty.');
    }
    if (!icon || typeof icon !== 'string' || icon.trim() === '') {
        throw (0, http_errors_1.default)(400, '"icon" is required and cannot be empty.');
    }
    if (!type || typeof type !== 'string' || type.trim() === '') {
        throw (0, http_errors_1.default)(400, '"type" is required and cannot be empty.');
    }
    if (type === 'file' && !file) {
        throw (0, http_errors_1.default)(400, '"file" is required and cannot be empty.');
    }
    if (type === 'link' && !link) {
        throw (0, http_errors_1.default)(400, '"link" is required and cannot be empty.');
    }
    if (!subDataId || !mongoose_1.default.Types.ObjectId.isValid(subDataId)) {
        throw (0, http_errors_1.default)(400, 'Valid "subDataId" is required.');
    }
    // Check if subData exists
    const subDataExists = yield subdata_model_1.SubDataModel.exists({ _id: subDataId });
    if (!subDataExists) {
        throw (0, http_errors_1.default)(404, 'SubData with the given ID does not exist.');
    }
    // Check for duplicate
    const duplicate = yield resourceItem_model_1.ResourceItemModel.exists({
        name: name.trim(),
        type: type.trim(),
        icon: icon.trim(),
        subDataId
    });
    if (duplicate) {
        throw (0, http_errors_1.default)(409, 'ResourceItem with the same name, link, and type already exists under this SubData.');
    }
    try {
        // Create and link
        const resourceItem = new resourceItem_model_1.ResourceItemModel({
            name: name.trim(),
            type: type.trim(),
            icon: icon.trim(),
            subDataId
        });
        const updatedSubData = yield subdata_model_1.SubDataModel.findByIdAndUpdate(subDataId, { $push: { data: resourceItem._id } }, { session }).populate({
            path: 'resourceDataEntryId',
            select: 'resourceId _id'
        });
        if (!(updatedSubData === null || updatedSubData === void 0 ? void 0 : updatedSubData.resourceDataEntryId)) {
            throw (0, http_errors_1.default)(404, 'Failed to populate resourceDataEntryId');
        }
        const resourceDataEntry = updatedSubData.resourceDataEntryId;
        resourceItem.link = type === 'file' ? `${resourceDataEntry.resourceId}/${resourceDataEntry._id}/${updatedSubData._id}/${resourceItem._id}` : link;
        yield resourceItem.save({ session });
        if (type === 'file') {
            yield (0, awsS3_1.uploadToS3)(file.buffer, resourceItem.link, file.mimetype);
        }
        yield session.commitTransaction();
        res.status(201).json({ message: 'ResourceItem created and linked', resourceItem });
    }
    catch (err) {
        yield session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
})));
exports.createRouter.put('/resource-items/:id', upload.single('file'), (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, type, subDataId, link, icon } = req.body;
    const file = req.file;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    // Validate ID and required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
        throw (0, http_errors_1.default)(400, '"name" is required and cannot be empty.');
    }
    if (!icon || typeof icon !== 'string' || icon.trim() === '') {
        throw (0, http_errors_1.default)(400, '"icon" is required and cannot be empty.');
    }
    if (!type || typeof type !== 'string' || type.trim() === '') {
        throw (0, http_errors_1.default)(400, '"type" is required and cannot be empty.');
    }
    if (type === 'link' && !link) {
        throw (0, http_errors_1.default)(400, '"link" is required and cannot be empty.');
    }
    if (!subDataId || !mongoose_1.default.Types.ObjectId.isValid(subDataId)) {
        throw (0, http_errors_1.default)(400, 'Valid "subDataId" is required.');
    }
    const existingItem = yield resourceItem_model_1.ResourceItemModel.findById(id);
    if (!existingItem) {
        throw (0, http_errors_1.default)(404, 'ResourceItem not found.');
    }
    const subData = yield subdata_model_1.SubDataModel.findById(subDataId).populate({
        path: 'resourceDataEntryId',
        select: 'resourceId'
    });
    if (!subData || !subData.resourceDataEntryId) {
        throw (0, http_errors_1.default)(404, 'Linked SubData or its parent entry not found.');
    }
    try {
        // Check for duplicate
        const duplicate = yield resourceItem_model_1.ResourceItemModel.findOne({
            _id: { $ne: id },
            name: name.trim(),
            type: type.trim(),
            icon: icon.trim(),
            subDataId
        });
        if (duplicate) {
            throw (0, http_errors_1.default)(409, 'Another ResourceItem with same name and type exists under this SubData.');
        }
        // Update values
        existingItem.name = name.trim();
        existingItem.type = type.trim();
        // Construct new S3 link and upload if file provided
        const resourceDataEntry = subData.resourceDataEntryId;
        existingItem.link = type === 'file' ? `${resourceDataEntry.resourceId}/${resourceDataEntry._id}/${subData._id}/${id}` : link;
        yield existingItem.save({ session });
        if (type === 'file' && file) {
            yield (0, awsS3_1.uploadToS3)(file.buffer, existingItem.link, file.mimetype);
        }
        yield session.commitTransaction();
        res.status(200).json({ message: 'ResourceItem updated successfully', resourceItem: existingItem });
    }
    catch (err) {
        yield session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
})));
exports.createRouter.delete('/resource-items/:id', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    const item = yield resourceItem_model_1.ResourceItemModel.findById(id);
    if (!item) {
        throw (0, http_errors_1.default)(404, 'ResourceItem not found.');
    }
    try {
        // Remove from parent subData
        yield subdata_model_1.SubDataModel.findByIdAndUpdate(item.subDataId, { $pull: { data: item._id } }, { session });
        // Delete ResourceItem
        yield resourceItem_model_1.ResourceItemModel.findByIdAndDelete(item._id, { session });
        // Delete from S3 if file exists
        if (item.link) {
            yield (0, awsS3_1.deleteFromS3)(item.link);
        }
        yield session.commitTransaction();
        res.status(200).json({ message: 'ResourceItem deleted successfully' });
    }
    catch (err) {
        yield session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
})));
