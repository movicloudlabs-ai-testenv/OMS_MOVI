import Notification from '../models/Notification.js';

/**
 * Send Notification Utility
 * Creates a notification document for the specified recipient.
 * Future: add socket.io emit here for real-time push.
 */
export const sendNotification = async ({
  recipient,
  type,
  title,
  message,
  link,
  sender,
  metadata,
}) => {
  try {
    await Notification.create({
      recipient,
      type,
      title,
      message,
      link,
      sender,
      metadata,
    });
  } catch (err) {
    // Notification failures should never break the main operation
    if (process.env.NODE_ENV === 'development') {
      console.error('Notification send failed:', err.message);
    }
  }
};
