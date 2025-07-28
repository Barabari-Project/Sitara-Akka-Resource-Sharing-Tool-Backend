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
exports.createTemplate = exports.getTemplatesByType = exports.authRouter = void 0;
// routes/auth.ts
const express_1 = require("express");
const user_model_1 = require("../models/user.model");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const http_errors_1 = __importDefault(require("http-errors"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const whatsappTemplate_model_1 = require("../models/whatsappTemplate.model");
const wp_1 = require("../utility/wp");
exports.authRouter = (0, express_1.Router)();
// POST /register
exports.authRouter.post('/register', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phoneNumber, firstName, lastName, age, gender, std } = req.body;
    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim() === '' || phoneNumber.trim().length !== 10) {
        throw (0, http_errors_1.default)(400, 'Phone number is required');
    }
    const user = yield user_model_1.UserModel.create({
        phoneNumber: phoneNumber.trim(),
        firstName: firstName === null || firstName === void 0 ? void 0 : firstName.trim(),
        lastName: lastName === null || lastName === void 0 ? void 0 : lastName.trim(),
        age: age,
        gender: gender === null || gender === void 0 ? void 0 : gender.trim(),
        std: std === null || std === void 0 ? void 0 : std.trim(),
        role: auth_middleware_1.UserRoles.USER
    });
    const token = jsonwebtoken_1.default.sign({ phoneNumber: user.phoneNumber, role: user === null || user === void 0 ? void 0 : user.role }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
    res.status(201).json({ message: 'User registered', user, token });
})));
// POST /login
exports.authRouter.post('/login', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phoneNumber } = req.body;
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        throw (0, http_errors_1.default)(400, 'Phone number is required');
    }
    let user = yield user_model_1.UserModel.findOne({ phoneNumber });
    let isAlreadyPresent = true;
    if (!user) {
        // user = await UserModel.create({ phoneNumber });
        isAlreadyPresent = false;
    }
    if (user) {
        const token = jsonwebtoken_1.default.sign({ phoneNumber: user.phoneNumber, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '7d'
        });
        res.status(200).json({ message: 'Login successful', token, user, isAlreadyPresent });
    }
    res.status(200).json({ isAlreadyPresent });
})));
// POST /login
exports.authRouter.post('/admin/login', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phoneNumber, password } = req.body;
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        throw (0, http_errors_1.default)(400, 'Phone number is required');
    }
    let user = yield user_model_1.UserModel.findOne({ phoneNumber, role: auth_middleware_1.UserRoles.ADMIN, password: password });
    if (!user) {
        throw (0, http_errors_1.default)(404, 'Invalid Credentials');
    }
    const token = jsonwebtoken_1.default.sign({ phoneNumber: user.phoneNumber, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
    res.status(200).json({ message: 'Login successful', token, user });
})));
exports.authRouter.post("/new_form", (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { firstName, lastName, schoolName, district, medium, gender, phoneNumber, std, questionAnswers } = req.body;
    //  Validations
    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim().length !== 10) {
        throw (0, http_errors_1.default)(400, 'Valid 10-digit phone number is required');
    }
    if (!schoolName || typeof schoolName !== 'string' || schoolName.trim() === '') {
        throw (0, http_errors_1.default)(400, 'School Name is required');
    }
    if (!district || typeof district !== 'string' || district.trim() === '') {
        throw (0, http_errors_1.default)(400, 'District is required');
    }
    if (!medium || typeof medium !== 'string' || medium.trim() === '') {
        throw (0, http_errors_1.default)(400, 'Medium is required');
    }
    // ✅ Check if questionAnswers is provided and valid
    let validQA = undefined;
    if (Array.isArray(questionAnswers) && questionAnswers.length === 3) {
        for (const qa of questionAnswers) {
            if (typeof qa !== 'object' ||
                typeof qa.question !== 'number' ||
                typeof qa.ans !== 'string' ||
                qa.ans.trim() === '') {
                throw (0, http_errors_1.default)(400, 'Each question answer must have a question number and a non-empty answer!');
            }
        }
        validQA = questionAnswers;
    }
    // ✅ Save or update user
    const user = yield user_model_1.UserModel.findOneAndUpdate({ phoneNumber }, Object.assign({ phoneNumber: phoneNumber.trim(), firstName: firstName === null || firstName === void 0 ? void 0 : firstName.trim(), lastName: lastName === null || lastName === void 0 ? void 0 : lastName.trim(), gender: gender === null || gender === void 0 ? void 0 : gender.trim(), std: std === null || std === void 0 ? void 0 : std.trim(), schoolName: schoolName.trim(), district: district.trim(), medium: medium.trim(), role: auth_middleware_1.UserRoles.USER }, (validQA ? { questionAnswers: validQA } : {}) // only include if valid
    ), { new: true, upsert: true });
    // TODO: JASH: verify this are we getting std as string? if not then change this if condition accordingly
    if (std == "10") {
        console.log(std);
        (0, wp_1.sendTextTemplateMsg)("91" + phoneNumber, "welcome_message_2025");
    }
    // ✅ Generate token
    const token = jsonwebtoken_1.default.sign({ phoneNumber: user === null || user === void 0 ? void 0 : user.phoneNumber, role: user === null || user === void 0 ? void 0 : user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'User registered', user, token });
})));
const getTemplatesByType = (type) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const template = yield whatsappTemplate_model_1.WhatsappTemplateModel.findOne({ type }).select('templateName -_id');
        return (template === null || template === void 0 ? void 0 : template.templateName) || null;
    }
    catch (error) {
        console.error('Error fetching template:', error);
        return null;
    }
});
exports.getTemplatesByType = getTemplatesByType;
const createTemplate = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newTemplate = yield whatsappTemplate_model_1.WhatsappTemplateModel.create({
            type: 'Other Std', // or 'sms', etc.
            templateName: 'WelcomeTemplate'
        });
        console.log('Template created successfully:', newTemplate);
    }
    catch (error) {
        console.error('Error creating template:', error);
    }
});
exports.createTemplate = createTemplate;
// GET /me
exports.authRouter.get('/get_user', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw (0, http_errors_1.default)(401, 'Authorization token missing or invalid');
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = yield user_model_1.UserModel.findOne({ phoneNumber: decoded.phoneNumber }).select('-password');
        if (!user) {
            throw (0, http_errors_1.default)(404, 'User not found');
        }
        res.status(200).json({ user });
    }
    catch (error) {
        console.error(error);
        throw (0, http_errors_1.default)(401, 'Invalid or expired token');
    }
})));
