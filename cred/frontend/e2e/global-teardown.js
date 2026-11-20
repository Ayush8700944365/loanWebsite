import { rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import User from '../../backend/src/models/User.js';

export default async function globalTeardown() {
  const uri = process.env.PLAYWRIGHT_MONGO_URI;
  const databaseName = process.env.PLAYWRIGHT_E2E_DB_NAME;
  if (!uri || !databaseName?.startsWith('realcred_pw_e2e_')) return;
  const mongoose = User.db.base;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await mongoose.connection.dropDatabase();
  } finally {
    await mongoose.disconnect();
    await rm(path.join(os.tmpdir(), databaseName), { recursive: true, force: true });
  }
}
