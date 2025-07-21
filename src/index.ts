import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { connectToDatabase } from './config/database';
import { authMiddleware, UserRoles } from './middleware/auth.middleware';
import { errorHandler } from './middleware/error.middleware';
import { authRouter } from './route/auth.route';
import { createRouter } from './route/create.route';
import { getRouter } from './route/get.route';

dotenv.config();

const app = express();


app.use(express.json());
const allowedOrigins = '*';

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean | string) => void) => {
    if (!origin || allowedOrigins === '*') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Allow cookies and Authorization headers, if any.
};

app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

connectToDatabase();

app.use('/sitara/api', getRouter);
app.use('/sitara/api', authRouter);
app.use('/sitara/api', authMiddleware([UserRoles.ADMIN]), createRouter);

app.use(errorHandler);

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});

import axios from 'axios';
const helper = async()=>{

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

axios.post(url, data, { headers })
  .then(response => {
    console.log('✅ Response:', response.data);
  })
  .catch(error => {
    console.error('❌ Error:', error.response?.data || error.message);
  });

}

helper();