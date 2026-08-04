import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * File Upload Middleware (Multer — Local Disk Storage)
 * Stores files in ./uploads/{type}/ directories.
 * Set req.uploadType before using: 'avatars', 'attachments', 'reports'
 * Future: swap storage engine for Cloudinary/S3 without changing API.
 */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.uploadType || 'attachments';
    const dir = `./uploads/${type}/`;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|pdf|xlsx|docx|csv/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = allowed.test(file.mimetype);
  if (allowed.test(ext) || mime) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Accepted: jpeg, jpg, png, pdf, xlsx, docx, csv'), false);
  }
};

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

// Convenience middleware to set upload type
export const setUploadType = (type) => (req, res, next) => {
  req.uploadType = type;
  next();
};
