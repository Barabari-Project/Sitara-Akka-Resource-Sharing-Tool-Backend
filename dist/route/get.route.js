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
exports.getRouter = void 0;
const express_1 = require("express");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const http_errors_1 = __importDefault(require("http-errors"));
const mongoose_1 = __importDefault(require("mongoose"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const dropDown_model_1 = require("../models/dropDown.model");
const expiringMedia_model_1 = require("../models/expiringMedia.model");
const resource_model_1 = require("../models/resource.model");
const resourceDataEntry_model_1 = require("../models/resourceDataEntry.model");
const resourceItem_model_1 = require("../models/resourceItem.model");
const subdata_model_1 = require("../models/subdata.model");
const user_model_1 = require("../models/user.model");
const wp_1 = require("../utility/wp");
exports.getRouter = (0, express_1.Router)();
// GET unique languages
exports.getRouter.get('/resources/languages', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const type = "language";
    if (!Object.values(dropDown_model_1.DropDownType).includes(type)) {
        throw (0, http_errors_1.default)(400, 'Invalid dropdown type');
    }
    const dropdownData = yield dropDown_model_1.DropDownModel.findOne({ type }).select('type value');
    res.status(200).json({ languages: dropdownData.value });
})));
// GET unique subjects based on language
exports.getRouter.get('/resources/subjects', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { lan } = req.query;
    if (!lan || typeof lan !== 'string') {
        throw (0, http_errors_1.default)(400, 'Query param "lan" is required and must be a string.');
    }
    const resources = yield resource_model_1.ResourceModel.find({ lan }).select('-data -__v');
    res.status(200).json({ resources });
})));
// {
//   "resources": [
//     { "subj": "Math", "types": ["pdf", "video"] },
//     { "subj": "English", "types": ["audio", "pdf"] }
//   ]
// }
exports.getRouter.get('/resources/subjects/v1', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { lan } = req.query;
    if (!lan || typeof lan !== 'string') {
        throw (0, http_errors_1.default)(400, 'Query param "lan" is required and must be a string.');
    }
    // Step 1: Fetch all resources for the given language
    const resources = yield resource_model_1.ResourceModel.find({ lan }).populate({
        path: 'data',
        select: 'type'
    });
    // Step 2: Map subj -> { types: Set<string>, _id: string }
    const subjMap = {};
    for (const resource of resources) {
        const subject = resource.subj;
        if (!subjMap[subject]) {
            subjMap[subject] = { types: new Set(), _id: resource._id.toString() };
        }
        resource.data.forEach((entry) => {
            if (entry === null || entry === void 0 ? void 0 : entry.type) {
                subjMap[subject].types.add(entry.type);
            }
        });
    }
    // Step 3: Convert to desired response format
    const response = Object.entries(subjMap).map(([subj, data]) => ({
        subj,
        types: Array.from(data.types),
        _id: data._id
    }));
    res.status(200).json({ resources: response });
})));
exports.getRouter.get('/resources/data/v1', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { resourceId, type } = req.query;
    if (!resourceId || typeof resourceId !== 'string' || !mongoose_1.default.Types.ObjectId.isValid(resourceId)) {
        throw (0, http_errors_1.default)(400, 'Valid query param "resourceId" is required.');
    }
    if (!type || typeof type !== 'string') {
        throw (0, http_errors_1.default)(400, 'Query param "type" is required and must be a string.');
    }
    // Step 1: Find the resource by ID and populate its data
    const resource = yield resource_model_1.ResourceModel.findById(resourceId).populate({
        path: 'data',
        match: { type },
        select: '-__v'
    });
    if (!resource) {
        throw (0, http_errors_1.default)(404, 'Resource not found.');
    }
    // Step 2: Return filtered resource data entries
    res.status(200).json({ data: resource.data });
})));
exports.getRouter.get('/send-file', (0, auth_middleware_1.authMiddleware)([auth_middleware_1.UserRoles.ADMIN, auth_middleware_1.UserRoles.USER]), (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.query;
    const data = yield resourceDataEntry_model_1.ResourceDataEntryModel.findById(id);
    if (!data) {
        throw (0, http_errors_1.default)(404, 'Internal server error. Please try again later.');
    }
    const media = yield expiringMedia_model_1.ExpiringMediaModel.findById(id);
    if (!media) {
        throw (0, http_errors_1.default)(404, 'Internal server error. Please try again later.');
    }
    else {
        yield (0, wp_1.sendMediaTemplate)(req.phoneNumber, parseInt(media.mediaId), data.name, media.mimeType);
    }
    res.status(200).json({ message: 'Media sent successfully' });
})));
// GET all resource data entries for a given resourceId
exports.getRouter.get('/resource-data-entries/:resourceId', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { resourceId } = req.params;
    console.log(resourceId);
    const entries = yield resourceDataEntry_model_1.ResourceDataEntryModel.find({ resourceId });
    console.log(entries);
    res.status(200).json({ entries });
})));
// GET all subdata entries for a given resourceDataEntryId
exports.getRouter.get('/subdata/:resourceDataEntryId', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { resourceDataEntryId } = req.params;
    const subData = yield subdata_model_1.SubDataModel.find({ resourceDataEntryId }).select('-data -__v -resourceDataEntryId ').lean();
    for (const sub of subData) {
        if (sub.datatype === 'file') {
            sub.link = '';
        }
    }
    res.status(200).json({ subData });
})));
exports.getRouter.get('/resource-items/:subDataId', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { subDataId } = req.params;
    const items = yield resourceItem_model_1.ResourceItemModel.find({ subDataId }).select('-subDataId -__v').lean();
    for (const item of items) {
        if (item.type === 'file') {
            item.link = '';
        }
    }
    res.status(200).json({ items });
})));
// GET resource item link by ID
exports.getRouter.get('/resource-items/link/:id', (0, auth_middleware_1.authMiddleware)([auth_middleware_1.UserRoles.ADMIN, auth_middleware_1.UserRoles.USER]), (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw (0, http_errors_1.default)(400, 'Invalid ID');
    }
    const item = yield resourceItem_model_1.ResourceItemModel.findById(id).select('type link');
    if (!item || item.type !== 'file' || !item.link) {
        throw (0, http_errors_1.default)(404, 'Resource item not found');
    }
    const media = yield expiringMedia_model_1.ExpiringMediaModel.findById(id);
    if (!media) {
        throw (0, http_errors_1.default)(404, 'Internal server error. Please try again later.');
    }
    else {
        // await sendMediaToWhatsApp(media.mediaId, (req as any).phoneNumber, media.mimeType);
    }
    res.status(200).json({ message: 'Media sent successfully' });
})));
// GET SubData's data array by SubData ID
exports.getRouter.get('/subdata/link/:id', (0, auth_middleware_1.authMiddleware)([auth_middleware_1.UserRoles.ADMIN, auth_middleware_1.UserRoles.USER]), (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const subData = yield subdata_model_1.SubDataModel.findById(id).select('datatype link');
    if (!subData || subData.datatype !== 'file' || !subData.link) {
        throw (0, http_errors_1.default)(404, 'SubData not found');
    }
    const media = yield expiringMedia_model_1.ExpiringMediaModel.findById(id);
    if (!media) {
        throw (0, http_errors_1.default)(404, 'Internal server error. Please try again later.');
    }
    else {
        // await sendMediaToWhatsApp(media.mediaId, (req as any).phoneNumber, media.mimeType);
    }
    res.status(200).json({ message: 'Media sent successfully' });
})));
exports.getRouter.get('/dropdown-data', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { type } = req.query;
    if (!type || typeof type !== 'string') {
        throw (0, http_errors_1.default)(400, 'Query param "type" is required and must be a string.');
    }
    if (!Object.values(dropDown_model_1.DropDownType).includes(type)) {
        throw (0, http_errors_1.default)(400, 'Invalid dropdown type');
    }
    const dropdownData = yield dropDown_model_1.DropDownModel.find({ type }).select('type value');
    res.status(200).json({ dropdownData });
})));
exports.getRouter.get("/user_check", (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phoneNumber } = req.query;
    if (!phoneNumber || typeof phoneNumber !== "string") {
        throw (0, http_errors_1.default)(400, 'Query param "phoneNumber" is required and must be a string.');
    }
    const isUser = yield user_model_1.UserModel.findOne({ phoneNumber });
    if (isUser) {
        res.status(200).json({
            newForm: false
        });
    }
    else {
        res.status(200).json({
            newForm: true
        });
    }
})));
