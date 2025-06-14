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
    const existingUser = yield user_model_1.UserModel.findOne({ phoneNumber });
    if (existingUser) {
        throw (0, http_errors_1.default)(409, 'User with this phone number already exists');
    }
    const user = new user_model_1.UserModel({
        phoneNumber: phoneNumber.trim(),
        firstName: firstName === null || firstName === void 0 ? void 0 : firstName.trim(),
        lastName: lastName === null || lastName === void 0 ? void 0 : lastName.trim(),
        age,
        role: auth_middleware_1.UserRoles.USER,
        gender: gender === null || gender === void 0 ? void 0 : gender.trim(),
        std: std === null || std === void 0 ? void 0 : std.trim()
    });
    yield user.save();
    res.status(201).json({ message: 'User registered', user });
})));
// POST /login
exports.authRouter.post('/login', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phoneNumber } = req.body;
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        throw (0, http_errors_1.default)(400, 'Phone number is required');
    }
    const user = yield user_model_1.UserModel.findOne({ phoneNumber });
    if (!user) {
        throw (0, http_errors_1.default)(404, 'User not found');
    }
    const token = jsonwebtoken_1.default.sign({ phoneNumber: user.phoneNumber, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
    res.status(200).json({ message: 'Login successful', token });
})));
