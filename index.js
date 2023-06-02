import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import { startApp } from './src/app.js';

startApp();