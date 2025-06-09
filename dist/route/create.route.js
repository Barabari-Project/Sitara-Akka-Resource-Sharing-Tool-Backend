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
const resource_model_1 = require("../models/resource.model");
const resourceDataEntry_model_1 = require("../models/resourceDataEntry.model");
const subdata_model_1 = require("../models/subdata.model");
const resourceItem_model_1 = require("../models/resourceItem.model");
const mongoose_1 = __importDefault(require("mongoose"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const http_errors_1 = __importDefault(require("http-errors"));
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
        throw (0, http_errors_1.default)(409, 'Resource with same lan, class, and subj already exists');
    }
    // Create and save new resource
    const resource = new resource_model_1.ResourceModel({
        lan,
        class: className,
        subj,
        data: []
    });
    yield resource.save();
    res.status(201).json({ message: 'Resource created', resource });
})));
// POST /resource-data-entries
exports.createRouter.post('/resource-data-entries', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
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
        throw (0, http_errors_1.default)(500, 'Failed to create ResourceDataEntry', err);
    }
    finally {
        session.endSession();
    }
})));
// POST /subdata
exports.createRouter.post('/subdata', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { name, datatype, link, resourceDataEntryId } = req.body;
        // Basic validation
        if (!name || typeof name !== 'string' || name.trim() === '') {
            throw (0, http_errors_1.default)(400, '"name" is required and cannot be empty.');
        }
        if (!['string', 'array'].includes(datatype)) {
            throw (0, http_errors_1.default)(400, '"datatype" must be either "string" or "array".');
        }
        if (!resourceDataEntryId || !mongoose_1.default.Types.ObjectId.isValid(resourceDataEntryId)) {
            throw (0, http_errors_1.default)(400, 'Valid "resourceDataEntryId" is required.');
        }
        // Link requirement based on datatype
        if (datatype === 'string' && (!link || typeof link !== 'string' || link.trim() === '')) {
            throw (0, http_errors_1.default)(400, '"link" is required when datatype is "string".');
        }
        if (datatype === 'array' && link) {
            throw (0, http_errors_1.default)(400, '"link" must not be provided when datatype is "array".');
        }
        // Check if parent exists
        const entryExists = yield resourceDataEntry_model_1.ResourceDataEntryModel.exists({ _id: resourceDataEntryId });
        if (!entryExists) {
            throw (0, http_errors_1.default)(404, 'Parent ResourceDataEntry not found.');
        }
        // Check for duplicate
        const duplicateQuery = {
            name: name.trim(),
            datatype,
            resourceDataEntryId
        };
        if (datatype === 'string') {
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
            link: datatype === 'string' ? link.trim() : '',
            data: [],
            resourceDataEntryId
        });
        yield subData.save({ session });
        yield resourceDataEntry_model_1.ResourceDataEntryModel.findByIdAndUpdate(resourceDataEntryId, { $push: { data: subData._id } }, { session });
        yield session.commitTransaction();
        res.status(201).json({ message: 'SubData created and linked', subData });
    }
    catch (err) {
        yield session.abortTransaction();
        throw (0, http_errors_1.default)(500, 'Failed to create SubData', err);
    }
    finally {
        session.endSession();
    }
})));
// POST /resource-items
exports.createRouter.post('/resource-items', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { name, link, type, subDataId } = req.body;
        // Validation: Required fields
        if (!name || typeof name !== 'string' || name.trim() === '') {
            throw (0, http_errors_1.default)(400, '"name" is required and cannot be empty.');
        }
        if (!link || typeof link !== 'string' || link.trim() === '') {
            throw (0, http_errors_1.default)(400, '"link" is required and cannot be empty.');
        }
        if (!type || typeof type !== 'string' || type.trim() === '') {
            throw (0, http_errors_1.default)(400, '"type" is required and cannot be empty.');
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
            subDataId
        });
        if (duplicate) {
            throw (0, http_errors_1.default)(409, 'ResourceItem with the same name, link, and type already exists under this SubData.');
        }
        // Create and link
        const resourceItem = new resourceItem_model_1.ResourceItemModel({
            name: name.trim(),
            link: link.trim(),
            type: type.trim(),
            subDataId
        });
        yield resourceItem.save({ session });
        yield subdata_model_1.SubDataModel.findByIdAndUpdate(subDataId, { $push: { data: resourceItem._id } }, { session });
        yield session.commitTransaction();
        res.status(201).json({ message: 'ResourceItem created and linked', resourceItem });
    }
    catch (err) {
        yield session.abortTransaction();
        throw (0, http_errors_1.default)(500, 'Failed to create ResourceItem', err);
    }
    finally {
        session.endSession();
    }
})));
