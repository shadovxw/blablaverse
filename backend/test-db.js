import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import mongoose from 'mongoose';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

console.log('URI:', process.env.MONGO_URL);

mongoose.connect(process.env.MONGO_URL)
    .then(() => { console.log('Connected!'); process.exit(0); })
    .catch(err => { console.error('Failed:', err.message); process.exit(1); });