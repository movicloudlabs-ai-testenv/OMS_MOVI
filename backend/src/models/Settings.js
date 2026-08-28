import mongoose from 'mongoose';
const { Schema } = mongoose;

const SettingsSchema = new Schema({
  key: { type: String, default: 'global', unique: true },

  general: {
    appName:      { type: String, default: 'Office Workspace Management System' },
    orgName:      { type: String, default: 'Movi Cloud Labs' },
    timezone:     { type: String, default: 'Asia/Kolkata' },
    dateFormat: {
      type: String,
      enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY'],
      default: 'DD/MM/YYYY',
    },
    timeFormat:   { type: String, enum: ['12', '24'], default: '24' },
    itemsPerPage: { type: Number, min: 10, max: 100, default: 25 },
  },

  security: {
    minPasswordLength:     { type: Number, min: 6, max: 32, default: 8 },
    requireUppercase:      { type: Boolean, default: true },
    requireLowercase:      { type: Boolean, default: true },
    requireNumbers:        { type: Boolean, default: true },
    requireSpecial:        { type: Boolean, default: false },
    passwordExpiryEnabled: { type: Boolean, default: false },
    passwordExpiryDays:    { type: Number, min: 30, max: 365, default: 90 },
    sessionTimeout: {
      type: String,
      enum: ['15min', '30min', '1hour', '2hours', '4hours', '8hours', 'never'],
      default: '1hour',
    },
    maxFailedLogins: { type: Number, min: 3, max: 10, default: 5 },
    lockoutDuration: {
      type: String,
      enum: ['5min', '15min', '30min', '1hour', 'until_admin_unlock'],
      default: '15min',
    },
    twoFactorPolicy: {
      type: String,
      enum: ['disabled', 'optional', 'required'],
      default: 'optional',
    },
  },

  notifications: {
    smtpHost:       { type: String, default: '' },
    smtpPort:       { type: Number, default: 587 },
    smtpUser:       { type: String, default: '' },
    smtpPass:       { type: String, default: '', select: false },
    smtpEncryption: { type: String, enum: ['none', 'TLS', 'SSL'], default: 'TLS' },
    fromEmail:      { type: String, default: 'noreply@movicloudlabs.com' },
    fromName:       { type: String, default: 'OWMS Notifications' },

    // Sender identities — one SMTP connection, three visible senders.
    // Empty fields fall back to the default From above (fromName / fromEmail).
    // Onboarding — welcome emails for new users
    onboardingFromName:  { type: String, default: 'OWMS Onboarding' },
    onboardingFromEmail: { type: String, default: '' },
    onboardingReplyTo:   { type: String, default: '' },
    // Alerts — project assignments, task notifications, system alerts
    alertsFromName:      { type: String, default: 'OWMS Alerts' },
    alertsFromEmail:     { type: String, default: '' },
    alertsReplyTo:       { type: String, default: '' },
    // Support — password reset & helpline (Reply-To should be a monitored inbox)
    supportFromName:     { type: String, default: 'OWMS Support' },
    supportFromEmail:    { type: String, default: '' },
    supportReplyTo:      { type: String, default: '' },

    notifyNewUser:          { type: Boolean, default: true },
    notifyUserDeactivated:  { type: Boolean, default: true },
    notifyFailedLogin:      { type: Boolean, default: true },
    notifyPermissionChange: { type: Boolean, default: true },
    notifySystemError:      { type: Boolean, default: true },
    notifyLeaveRequest:     { type: Boolean, default: false },
    notifyReportGenerated:  { type: Boolean, default: false },
  },

  branding: {
    logoPath:      { type: String, default: null },
    loginTitle:    { type: String, default: 'Welcome to OWMS' },
    loginSubtitle: { type: String, default: 'Office Workspace Management System' },
  },

  system: {
    maintenanceMode:    { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: 'System is under maintenance. Please check back soon.' },
    apiEnabled:         { type: Boolean, default: true },
    apiRateLimit:       { type: Number, min: 10, max: 1000, default: 100 },
  },

  hr: {
    onboardingHRCap: { type: Number, min: 1, max: 50, default: 10 },
  },

}, { timestamps: true });

export default mongoose.model('Settings', SettingsSchema);
