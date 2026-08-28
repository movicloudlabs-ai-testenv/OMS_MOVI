/**
 * Environment Variable Validation
 * Ensures all required env vars are present before app starts.
 */
export const validateEnv = () => {
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

  console.log('✅ Environment variables validated');
};
