import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { isS3Enabled, uploadToS3 } from './s3.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// Ensure upload directories exist (only needed for local storage)
export function ensureUploadDir(subPath: string): string {
  const fullPath = path.join(UPLOAD_DIR, subPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  return fullPath;
}

// Generate a unique filename
function generateFilename(originalname: string): string {
  const timestamp = Date.now();
  const uniqueId = uuid().slice(0, 8);
  const ext = path.extname(originalname);
  return `photo-${timestamp}-${uniqueId}${ext}`;
}

// File filter for images only
const imageFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

// ==================== STORAGE CONFIGS ====================

// When S3 is enabled, use memory storage so we get the buffer to upload
// When S3 is not enabled, use disk storage as before

// Storage configuration for lead photos
const leadPhotoStorage = isS3Enabled
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, _file, cb) => {
        const leadId = req.params.id;
        const uploadPath = ensureUploadDir(`leads/${leadId}/photos`);
        cb(null, uploadPath);
      },
      filename: (_req, file, cb) => {
        cb(null, generateFilename(file.originalname));
      },
    });

// Storage configuration for project photos
const projectPhotoStorage = isS3Enabled
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, _file, cb) => {
        const projectId = req.params.projectId;
        const folder = req.body.folder || 'general';
        const uploadPath = ensureUploadDir(`projects/${projectId}/photos/${folder}`);
        cb(null, uploadPath);
      },
      filename: (_req, file, cb) => {
        cb(null, generateFilename(file.originalname));
      },
    });

// Lead photo upload middleware (single and multiple)
export const uploadLeadPhotos = multer({
  storage: leadPhotoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 20, // Max 20 files at once
  },
});

// Project photo upload middleware
export const uploadProjectPhotos = multer({
  storage: projectPhotoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 20,
  },
});

// ==================== SAVE FILE HELPER ====================

/**
 * Saves a file either to S3 or returns the local path.
 *
 * When S3 is enabled (memory storage), the file has a `buffer` property.
 * We upload that buffer to S3 and return the S3 URL.
 *
 * When S3 is disabled (disk storage), the file is already saved to disk
 * by multer. We return the local `/uploads/...` path.
 *
 * @param file - The multer file object
 * @param subPath - The S3 key prefix / local subfolder (e.g., "leads/abc123/photos")
 * @returns The URL or path to the saved file
 */
export async function saveFile(
  file: Express.Multer.File,
  subPath: string
): Promise<string> {
  if (isS3Enabled && file.buffer) {
    // Upload to S3
    const filename = generateFilename(file.originalname);
    const key = `${subPath}/${filename}`;
    const s3Url = await uploadToS3(file.buffer, key, file.mimetype);
    return s3Url;
  } else {
    // File already saved to disk by multer disk storage
    // Return the relative URL path
    const relativePath = path.relative(UPLOAD_DIR, file.path);
    return `/uploads/${relativePath}`;
  }
}

// Get the relative path for storage in DB
export function getRelativePath(fullPath: string): string {
  return path.relative(UPLOAD_DIR, fullPath);
}

// Get the full path from relative path
export function getFullPath(relativePath: string): string {
  return path.join(UPLOAD_DIR, relativePath);
}
