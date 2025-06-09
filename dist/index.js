"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const create_route_1 = require("./route/create.route");
const get_route_1 = require("./route/get.route");
const auth_route_1 = require("./route/auth.route");
const error_middleware_1 = require("./middleware/error.middleware");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
(0, database_1.connectToDatabase)();
app.use('/api', create_route_1.createRouter);
app.use('/api', get_route_1.getRouter);
app.use('/api', auth_route_1.authRouter);
app.use(error_middleware_1.errorHandler);
app.listen(3001, () => {
    console.log('Server is running on port 3001');
});
