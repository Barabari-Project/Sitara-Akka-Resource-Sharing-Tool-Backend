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
const axios_1 = __importDefault(require("axios"));
const helper = () => __awaiter(void 0, void 0, void 0, function* () {
    const url = 'https://next.meteor.sitaraakka.org/api/athena/messages/template';
    const headers = {
        'x-api-key': 'sk_114f8b6439abc2882bbb76d6986f8be1599dc536711d265dc044e6be94c2e8af',
        'Content-Type': 'application/json',
        'Cookie': '__Host-authjs.csrf-token=b5ab41c86d68468df471c999d7c0538285da2d6d7fbcbd1626ccb33d4fddb497%7C15b259dfc8eb46ee24c8815e0f0ff984bf45d1db2aacb31562199a707aa637a2; __Secure-authjs.callback-url=https%3A%2F%2Fnext.meteor.sitaraakka.org%2F; __Secure-authjs.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwia2lkIjoiMTlUdVZtVmRxRG5yU3JuUFZwN0hFdjZrNDRNQjNQLXNDSmxzbWE0cVZFQThfUVQ1MktNcDAwNFBfOHBlWWNYVllZX3FOcUJCd1pQSllaVnFnLWdPYncifQ..QOo4u0LXPKX67yyNP3jnOQ.QEC_hDcOy89o226yPG6NlbhKGW-E0J8YyOZpul-w43BJelOeK9Urw-WPUDY1FJdeaNg7RFvdGmNos-Pku_BnXBiZjrr-wYGgkF1mLJRZhoNYInyiBlJmWRwTuUNo1KbKo6Xs3pm-BxLECqeWGBd1BUWZnWn6GT4fxDHqjnxVNAyx3pO8hE4Fsbqn_pMsf_D3mAnna0xKAbyIUShO2nfrfOVyFCJsOWuQXSQOKmepyEo.2tuSNdEY3jjqV18_oeB7KSUuLkN5fXofDvNQcHEXx5Q'
    };
    const data = {
        templateName: "test_3",
        templateLanguage: "en",
        toPhoneNumber: "919033107408",
        components: [
            {
                type: "header",
                parameters: [
                    {
                        type: "document",
                        document: {
                            id: 592953390317025,
                            filename: "something.pdf"
                        }
                    }
                ]
            }
        ]
    };
    axios_1.default.post(url, data, { headers })
        .then(response => {
        console.log('✅ Response:', response.data);
    })
        .catch(error => {
        var _a;
        console.error('❌ Error:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
    });
});
helper();
