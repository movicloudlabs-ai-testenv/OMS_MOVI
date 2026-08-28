import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Document from '../models/Document.js';
import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getDocuments = async (req, res, next) => {
  try {
    let filter = {};
    const roleSlug = req.user.role?.slug || req.user.role || '';
    if (roleSlug === 'intern') {
      filter = { user: req.user._id };
    }
    if (req.query.userId) {
      filter.user = req.query.userId;
    }

    const docs = await Document.find(filter)
      .populate('user', 'name email')
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });

    sendSuccess(res, docs, 'Documents retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'No file uploaded', 400);

    const { userId, name, category } = req.body;
    if (!userId) return sendError(res, 'User ID is required', 400);

    const user = await User.findById(userId);
    if (!user) return sendError(res, 'Target user not found', 404);

    const doc = await Document.create({
      name: name || req.file.originalname,
      category: category || 'Other',
      filePath: `/uploads/documents/${req.file.filename}`,
      originalName: req.file.originalname,
      size: req.file.size,
      user: userId,
      uploadedBy: req.user._id
    });

    const populated = await Document.findById(doc._id).populate('user', 'name email');

    sendSuccess(res, populated, 'Document uploaded successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const downloadDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return sendError(res, 'Document not found', 404);

    const roleSlug = req.user.role?.slug || req.user.role || '';
    if (roleSlug === 'intern' && doc.user.toString() !== req.user._id.toString()) {
      return sendError(res, 'Unauthorized to download this document', 403);
    }

    const fullPath = path.join(__dirname, '..', '..', doc.filePath);
    if (!fs.existsSync(fullPath)) {
      return sendError(res, 'File not found on server', 404);
    }

    res.download(fullPath, doc.originalName || doc.name);
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return sendError(res, 'Document not found', 404);

    const roleSlug = req.user.role?.slug || req.user.role || '';
    if (roleSlug !== 'hr' && roleSlug !== 'admin') {
      return sendError(res, 'Unauthorized to delete documents', 403);
    }

    const fullPath = path.join(__dirname, '..', '..', doc.filePath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        console.error('Failed to delete file from disk:', err);
      }
    }

    await Document.findByIdAndDelete(req.params.id);

    sendSuccess(res, null, 'Document deleted successfully');
  } catch (error) {
    next(error);
  }
};
