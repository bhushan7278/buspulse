import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Driver from './models/Driver.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-bus-system';

mongoose.connect(MONGO_URI).then(async () => {
  const result = await Driver.updateOne(
    { name: 'Harshad Gurav' },
    { $set: { phone: '+919373166257' } }
  );
  console.log('Update Result:', result);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
