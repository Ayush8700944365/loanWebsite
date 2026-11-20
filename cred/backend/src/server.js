import "dotenv/config";
import { fileURLToPath } from "url";
import path from "path";
import app from "./app.js";
import connectDB from "./config/db.js";
import { validatePartnerEncryptionConfig } from "./services/partnerSensitiveData.js";

const startServer = async () => {
  try {
    if (process.env.NODE_ENV === "production") {
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("Production JWT_SECRET must contain at least 32 characters.");
      const encryptionConfig = validatePartnerEncryptionConfig({ production: true });
      if (!encryptionConfig.valid) throw new Error(encryptionConfig.message);
      if (!process.env.CLIENT_URL?.startsWith("https://")) throw new Error("Production CLIENT_URL must use HTTPS.");
      if (!process.env.MONGO_URI || (!process.env.MONGO_URI.startsWith("mongodb+srv://") && !/([?&]tls=true|[?&]ssl=true)/i.test(process.env.MONGO_URI))) throw new Error("Production MONGO_URI must use MongoDB Atlas SRV or explicitly enable TLS.");
    }
    await connectDB();
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log("--------------------------------");
      console.log(`RealCred Backend: http://localhost:${port}`);
      console.log(`Health API: http://localhost:${port}/api/health`);
      console.log("--------------------------------");
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) startServer();
