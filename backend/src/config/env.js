/**
 * Environment Variable Validation & Sensible Dev Fallbacks
 * Ensures the app starts smoothly in development even if .env is missing.
 */
export const validateEnv = () => {
  const DEV_DEFAULTS = {
    PORT: '5000',
    NODE_ENV: 'development',
    MONGO_URI: 'mongodb://localhost:27017/owms',
    JWT_SECRET: 'owms_default_super_secret_jwt_key_32chars_min_length_for_security',
    JWT_EXPIRE: '7d',
    JWT_REFRESH_SECRET: 'owms_default_super_secret_refresh_jwt_key_32chars_min_length',
    JWT_REFRESH_EXPIRE: '30d',
    FRONTEND_URL: 'http://localhost:5173',
    BCRYPT_ROUNDS: '10',
  };

  // Populate defaults for local development
  for (const [key, val] of Object.entries(DEV_DEFAULTS)) {
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }

  const required = [
    'PORT',
    'NODE_ENV',
    'MONGO_URI',
    'JWT_SECRET',
    'JWT_EXPIRE',
    'JWT_REFRESH_SECRET',
    'JWT_REFRESH_EXPIRE',
    'FRONTEND_URL',
    'BCRYPT_ROUNDS',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables:\n  ${missing.join('\n  ')}`);
    process.exit(1);
  }

  console.log('✅ Environment variables validated (Development defaults active if .env absent)');
};
