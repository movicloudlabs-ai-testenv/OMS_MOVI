import path from 'path';
import fs from 'fs';
import Document from '../models/Document.js';
import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * GET /api/documents
 * List all documents. HR and Admin can view all documents or filter by userId/category.
 * Employees and Interns can only view their own documents.
 */
export const getDocuments = async (req, res, next) => {
  try {
    const roleSlug = req.user.role?.slug || req.user.role || '';
    const isStaff = ['super-admin', 'admin', 'hr-manager', 'hr', 'pmo-lead', 'pmo'].includes(roleSlug);

    const filter = {};
    if (!isStaff) {
      filter.user = req.user._id;
    } else {
      if (req.query.userId) filter.user = req.query.userId;
    }

    if (req.query.category) filter.category = req.query.category;
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }

    const docs = await Document.find(filter)
      .populate('user', 'name email designation college role avatar')
      .populate('uploadedBy', 'name email avatar')
      .sort({ createdAt: -1 });

    sendSuccess(res, docs);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/documents
 * Upload a new compliance/intern document with multipart file upload.
 */
export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 'Please select a file to upload', 400);
    }

    const { userId, name, category } = req.body;
    const targetUserId = userId || req.user._id;

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return sendError(res, 'Target user not found', 404);
    }

    const doc = await Document.create({
      name: name || req.file.originalname,
      originalName: req.file.originalname,
      category: category || 'Other',
      filePath: req.file.path,
      fileType: req.file.mimetype,
      size: req.file.size,
      user: targetUser._id,
      uploadedBy: req.user._id,
    });

    const populated = await Document.findById(doc._id)
      .populate('user', 'name email designation college role avatar')
      .populate('uploadedBy', 'name email avatar');

    sendSuccess(res, populated, 'Document uploaded successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/documents/:id/download
 * Download binary document file.
 */
export const downloadDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return sendError(res, 'Document not found', 404);
    }

    const roleSlug = req.user.role?.slug || req.user.role || '';
    const isStaff = ['super-admin', 'admin', 'hr-manager', 'hr', 'pmo-lead', 'pmo'].includes(roleSlug);

    if (!isStaff && doc.user.toString() !== req.user._id.toString()) {
      return sendError(res, 'Not authorized to download this document', 403);
    }

    const absPath = path.resolve(doc.filePath);
    if (!fs.existsSync(absPath)) {
      return sendError(res, 'Physical file not found on server', 404);
    }

    res.download(absPath, doc.originalName || doc.name);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/documents/:id
 * Delete a document and unlink its file.
 */
export const deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return sendError(res, 'Document not found', 404);
    }

    const roleSlug = req.user.role?.slug || req.user.role || '';
    const isStaff = ['super-admin', 'admin', 'hr-manager', 'hr'].includes(roleSlug);

    if (!isStaff && doc.uploadedBy.toString() !== req.user._id.toString()) {
      return sendError(res, 'Not authorized to delete this document', 403);
    }

    const absPath = path.resolve(doc.filePath);
    if (fs.existsSync(absPath)) {
      try {
        fs.unlinkSync(absPath);
      } catch (err) {
        console.warn('Could not delete physical file:', err.message);
      }
    }

    await Document.findByIdAndDelete(doc._id);
    sendSuccess(res, null, 'Document deleted successfully');
  } catch (error) {
    next(error);
  }
};
