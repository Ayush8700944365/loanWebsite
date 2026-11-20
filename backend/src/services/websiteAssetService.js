import { randomUUID } from "crypto";
import { readFile, unlink } from "fs/promises";
import path from "path";
import { DOCUMENT_STORAGE_DIR } from "./leadDocumentService.js";
import WebsiteAsset from "../models/WebsiteAsset.js";

const MAX_IMAGE_SIZE = Math.min(Number(process.env.WEBSITE_IMAGE_MAX_SIZE) || 2 * 1024 * 1024, 5 * 1024 * 1024);
const IMAGE_TYPES = {
  ".png": {
    mime: "image/png",
    matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")),
  },
  ".jpg": {
    mime: "image/jpeg",
    matches: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  ".jpeg": {
    mime: "image/jpeg",
    matches: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  ".webp": {
    mime: "image/webp",
    matches: (buffer) => buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP",
  },
};

export function validateWebsiteImage(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) return { valid: false, message: "Choose a PNG, JPEG, or WebP image." };
  if (file.size > MAX_IMAGE_SIZE) return { valid: false, tooLarge: true, message: `Image must be no larger than ${Math.floor(MAX_IMAGE_SIZE / 1024 / 1024)} MB.` };
  const extension = path.extname(file.originalname || "").toLowerCase();
  const type = IMAGE_TYPES[extension];
  if (!type || file.mimetype !== type.mime || !type.matches(file.buffer)) {
    return { valid: false, message: "Image content must be a valid PNG, JPEG, or WebP file." };
  }
  return { valid: true, extension, mimeType: type.mime };
}

export async function storeWebsiteImage(file) {
  const result = validateWebsiteImage(file);
  if (!result.valid) {
    const error = new Error(result.message);
    error.statusCode = result.tooLarge ? 413 : 400;
    throw error;
  }
  const storageKey = `${randomUUID()}${result.extension}`;
  await WebsiteAsset.create({ storageKey, mimeType: result.mimeType, size: file.size, data: file.buffer });
  return { storageKey, mimeType: result.mimeType, size: file.size };
}

export function isWebsiteImageKey(storageKey) {
  return /^[0-9a-f-]{36}\.(png|jpe?g|webp)$/i.test(storageKey || "");
}

function websiteImageBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  // Lean queries expose Mongoose Buffer values as BSON Binary instances.
  if (value && typeof value.value === "function") return Buffer.from(value.value(true));
  if (value && Buffer.isBuffer(value.buffer)) {
    return value.buffer.subarray(0, Number.isInteger(value.position) ? value.position : value.buffer.length);
  }
  if (value?.type === "Buffer" && Array.isArray(value.data)) return Buffer.from(value.data);
  return Buffer.from(value || []);
}

export async function readWebsiteImage(storageKey) {
  if (!isWebsiteImageKey(storageKey)) return null;
  const storedAsset = await WebsiteAsset.findOne({ storageKey }).select("+data").lean();
  if (storedAsset?.data) return websiteImageBuffer(storedAsset.data);
  // Read legacy assets created before image storage moved into MongoDB.
  try {
    const legacyImage = await readFile(path.join(DOCUMENT_STORAGE_DIR, storageKey));
    const extension = path.extname(storageKey).toLowerCase();
    const mimeType = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
    // Migrate a reachable legacy disk image on first read so it remains
    // available across backend instances and deployments afterwards.
    await WebsiteAsset.updateOne(
      { storageKey },
      { $setOnInsert: { storageKey, mimeType, size: legacyImage.length, data: legacyImage } },
      { upsert: true },
    ).catch(() => {});
    return legacyImage;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function removeWebsiteImage(storageKey) {
  if (!isWebsiteImageKey(storageKey)) return;
  await WebsiteAsset.deleteOne({ storageKey });
  // Also remove a legacy disk copy, if one exists.
  await unlink(path.join(DOCUMENT_STORAGE_DIR, storageKey)).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
}
