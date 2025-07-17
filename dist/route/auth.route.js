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
exports.authRouter = void 0;
// routes/auth.ts
const express_1 = require("express");
const user_model_1 = require("../models/user.model");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const http_errors_1 = __importDefault(require("http-errors"));
const auth_middleware_1 = require("../middleware/auth.middleware");
exports.authRouter = (0, express_1.Router)();
// POST /register
exports.authRouter.post('/register', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phoneNumber, firstName, lastName, age, gender, std } = req.body;
    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim() === '' || phoneNumber.trim().length !== 10) {
        throw (0, http_errors_1.default)(400, 'Phone number is required');
    }
    const user = yield user_model_1.UserModel.findOneAndUpdate({ phoneNumber }, {
        phoneNumber: phoneNumber.trim(),
        firstName: firstName === null || firstName === void 0 ? void 0 : firstName.trim(),
        lastName: lastName === null || lastName === void 0 ? void 0 : lastName.trim(),
        age: age,
        gender: gender === null || gender === void 0 ? void 0 : gender.trim(),
        std: std === null || std === void 0 ? void 0 : std.trim(),
        role: auth_middleware_1.UserRoles.USER
    }, { new: true });
    const token = jsonwebtoken_1.default.sign({ phoneNumber: user === null || user === void 0 ? void 0 : user.phoneNumber, role: user === null || user === void 0 ? void 0 : user.role }, process.env.JWT_SECRET, {
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
        user = yield user_model_1.UserModel.create({ phoneNumber });
        isAlreadyPresent = false;
    }
    const token = jsonwebtoken_1.default.sign({ phoneNumber: user.phoneNumber, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
    res.status(200).json({ message: 'Login successful', token, user, isAlreadyPresent });
})));
// POST /login
exports.authRouter.post('/admin/login', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phoneNumber } = req.body;
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        throw (0, http_errors_1.default)(400, 'Phone number is required');
    }
    let user = yield user_model_1.UserModel.findOne({ phoneNumber, role: auth_middleware_1.UserRoles.ADMIN });
    let isAlreadyPresent = true;
    if (!user) {
        throw (0, http_errors_1.default)(404, 'User not found');
    }
    const token = jsonwebtoken_1.default.sign({ phoneNumber: user.phoneNumber, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
    res.status(200).json({ message: 'Login successful', token, user });
})));
exports.authRouter.post("/new_form", (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { firstName, lastName, schoolName, district, medium, gender, phoneNumber, std, is10th, questionAnswers } = req.body;
    //Validation
    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim() === '' || phoneNumber.trim().length !== 10) {
        throw (0, http_errors_1.default)(400, 'Phone number is required');
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
    // Not in 10th then Question and Answer included
    if (!is10th) {
        if (!Array.isArray(questionAnswers) || questionAnswers.length !== 3) {
            throw (0, http_errors_1.default)(400, 'Three question answers are required if not 10th standard');
        }
        for (const qa of questionAnswers) {
            if (typeof qa !== 'object' ||
                typeof qa.question !== 'number' ||
                typeof qa.ans !== 'string' ||
                qa.ans.trim() === '') {
                throw (0, http_errors_1.default)(400, 'Each question answer must have a question number and a non-empty answer !');
            }
        }
    }
    const user = yield user_model_1.UserModel.findOneAndUpdate({ phoneNumber }, Object.assign({ phoneNumber: phoneNumber.trim(), firstName: firstName === null || firstName === void 0 ? void 0 : firstName.trim(), lastName: lastName === null || lastName === void 0 ? void 0 : lastName.trim(), gender: gender === null || gender === void 0 ? void 0 : gender.trim(), std: std === null || std === void 0 ? void 0 : std.trim(), schoolName: schoolName === null || schoolName === void 0 ? void 0 : schoolName.trim(), district: district === null || district === void 0 ? void 0 : district.trim(), medium: medium === null || medium === void 0 ? void 0 : medium.trim(), role: auth_middleware_1.UserRoles.USER }, (is10th ? {} : { questionAnswers })), { new: true, upsert: true });
    const token = jsonwebtoken_1.default.sign({ phoneNumber: user === null || user === void 0 ? void 0 : user.phoneNumber, role: user === null || user === void 0 ? void 0 : user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'User registered', user, token });
})));
