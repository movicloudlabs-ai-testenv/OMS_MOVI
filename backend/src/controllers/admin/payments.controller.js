import Payment from '../../models/Payment.js';
import User from '../../models/User.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse.js';
import { getPagination } from '../../utils/paginate.js';
import { sendNotification } from '../../utils/sendNotification.js';

// GET /api/admin/payments — list all payments with optional filtering
export const getPayments = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status, internId, search } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (internId) filter.internId = internId;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('internId', 'name email employeeId college avatar')
        .populate('createdBy', 'name employeeId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    sendPaginated(res, payments, {
      total, page, limit,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/payments/:id
export const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('internId', 'name email employeeId college avatar')
      .populate('createdBy', 'name');

    if (!payment) return sendError(res, 'Payment record not found', 404);
    sendSuccess(res, payment);
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/payments
export const createPayment = async (req, res, next) => {
  try {
    const { internId, amount, description, status = 'pending', slipUrl, transactionId, paymentDate } = req.body;

    if (!internId || amount === undefined) {
      return sendError(res, 'Intern and amount are required', 400);
    }

    const intern = await User.findById(internId);
    if (!intern) return sendError(res, 'Intern user not found', 404);

    const payment = await Payment.create({
      internId,
      amount: Number(amount),
      description: description || 'Internship Stipend',
      status,
      slipUrl: slipUrl || '',
      transactionId: transactionId || '',
      paymentDate: paymentDate || new Date(),
      createdBy: req.user._id,
    });

    // Notify the intern
    try {
      await sendNotification({
        recipient: internId,
        type: 'system_alert',
        title: 'New Stipend Invoice Created',
        message: `A stipend invoice for ₹${Number(amount).toLocaleString()} (${status.toUpperCase()}) has been logged.`,
        link: '/intern/payments',
        sender: req.user._id,
      });
    } catch (e) {
      console.warn('Could not send notification:', e.message);
    }

    const populated = await Payment.findById(payment._id)
      .populate('internId', 'name email employeeId college avatar')
      .populate('createdBy', 'name');

    sendSuccess(res, populated, 'Payment invoice created', 201);
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/payments/:id
export const updatePayment = async (req, res, next) => {
  try {
    const { internId, amount, description, status, slipUrl, transactionId, paymentDate } = req.body;

    const payment = await Payment.findById(req.params.id);
    if (!payment) return sendError(res, 'Payment record not found', 404);

    const oldStatus = payment.status;

    if (internId) payment.internId = internId;
    if (amount !== undefined) payment.amount = Number(amount);
    if (description !== undefined) payment.description = description;
    if (status) payment.status = status;
    if (slipUrl !== undefined) payment.slipUrl = slipUrl;
    if (transactionId !== undefined) payment.transactionId = transactionId;
    if (paymentDate) payment.paymentDate = paymentDate;

    await payment.save();

    // If status changed to paid, notify intern
    if (status === 'paid' && oldStatus !== 'paid') {
      try {
        await sendNotification({
          recipient: payment.internId,
          type: 'system_alert',
          title: 'Stipend Disbursed',
          message: `Your stipend of ₹${payment.amount.toLocaleString()} has been marked as PAID.`,
          link: '/intern/payments',
          sender: req.user._id,
        });
      } catch (e) {
        console.warn('Could not send notification:', e.message);
      }
    }

    const populated = await Payment.findById(payment._id)
      .populate('internId', 'name email employeeId college avatar')
      .populate('createdBy', 'name');

    sendSuccess(res, populated, 'Payment record updated');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/payments/:id
export const deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) return sendError(res, 'Payment record not found', 404);
    sendSuccess(res, null, 'Payment deleted successfully');
  } catch (error) {
    next(error);
  }
};

// GET /api/intern/payments — intern views their personal stipend history
export const getMyPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ internId: req.user._id })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    sendSuccess(res, payments);
  } catch (error) {
    next(error);
  }
};
