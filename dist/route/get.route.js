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
const expiringMedia_model_1 = require("../models/expiringMedia.model");
const resource_model_1 = require("../models/resource.model");
const resourceDataEntry_model_1 = require("../models/resourceDataEntry.model");
const resourceItem_model_1 = require("../models/resourceItem.model");
const subdata_model_1 = require("../models/subdata.model");
const wp_1 = require("../utility/wp");
const dropDown_model_1 = require("../models/dropDown.model");
exports.getRouter = (0, express_1.Router)();
// GET unique languages
exports.getRouter.get('/resources/languages', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const languages = yield resource_model_1.ResourceModel.distinct('lan');
    res.status(200).json({ languages });
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
// GET all resource data entries for a given resourceId
exports.getRouter.get('/resource-data-entries/:resourceId', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { resourceId } = req.params;
    const entries = yield resourceDataEntry_model_1.ResourceDataEntryModel.find({ resourceId }).select('-data -__v -resourceId');
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
        yield (0, wp_1.sendMediaToWhatsApp)(media.mediaId, req.phoneNumber, media.mimeType);
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
        yield (0, wp_1.sendMediaToWhatsApp)(media.mediaId, req.phoneNumber, media.mimeType);
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
