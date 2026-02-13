import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// Ensure upload directories exist
export function ensureUploadDir(subPath: string): string {
  const fullPath = path.join(UPLOAD_DIR, subPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  return fullPath;
}

// Storage configuration for lead photos
const leadPhotoStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const leadId = req.params.id;
    const uploadPath = ensureUploadDir(`leads/${leadId}/photos`);
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const uniqueId = uuid().slice(0, 8);
    const ext = path.extname(file.originalname);
    cb(null, `photo-${timestamp}-${uniqueId}${ext}`);
  },
});

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

// Lead photo upload middleware (single and multiple)
export const uploadLeadPhotos = multer({
  storage: leadPhotoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 20, // Max 20 files at once
  },
});

// Storage configuration for project photos
const projectPhotoStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const projectId = req.params.projectId;
    const folder = req.body.folder || 'general';
    const uploadPath = ensureUploadDir(`projects/${projectId}/photos/${folder}`);
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const uniqueId = uuid().slice(0, 8);
    const ext = path.extname(file.originalname);
    cb(null, `photo-${timestamp}-${uniqueId}${ext}`);
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

// Get the relative path for storage in DB
export function getRelativePath(fullPath: string): string {
  return path.relative(UPLOAD_DIR, fullPath);
}

// Get the full path from relative path
export function getFullPath(relativePath: string): string {
  return path.join(UPLOAD_DIR, relativePath);
}
