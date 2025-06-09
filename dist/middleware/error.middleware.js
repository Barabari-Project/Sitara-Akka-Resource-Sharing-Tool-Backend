"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    var _a, _b, _c, _d;
    console.error(`Error occurred during ${req.method} request to ${req.url} | Status: ${(_a = err.statusCode) !== null && _a !== void 0 ? _a : 500} | Message: ${(_b = err.message) !== null && _b !== void 0 ? _b : 'No error message'} | Stack: ${(_c = err.stack) !== null && _c !== void 0 ? _c : 'No stack trace'}`);
    let statusCode = (_d = err.statusCode) !== null && _d !== void 0 ? _d : 500;
    let message = err.statusCode ? err.message : 'Internal Server Error. Please try again later.';
    res.status(statusCode).json({ message });
};
exports.errorHandler = errorHandler;
