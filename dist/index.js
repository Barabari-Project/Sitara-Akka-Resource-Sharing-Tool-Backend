"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const database_1 = require("./config/database");
const auth_middleware_1 = require("./middleware/auth.middleware");
const error_middleware_1 = require("./middleware/error.middleware");
const auth_route_1 = require("./route/auth.route");
const create_route_1 = require("./route/create.route");
const get_route_1 = require("./route/get.route");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const allowedOrigins = '*';
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins === '*') {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // Allow cookies and Authorization headers, if any.
};
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
(0, database_1.connectToDatabase)();
app.use('/sitara/api', get_route_1.getRouter);
app.use('/sitara/api', auth_route_1.authRouter);
app.use('/sitara/api', (0, auth_middleware_1.authMiddleware)([auth_middleware_1.UserRoles.ADMIN]), create_route_1.createRouter);
app.use(error_middleware_1.errorHandler);
app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
