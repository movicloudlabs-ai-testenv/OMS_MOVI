import jwt from 'jsonwebtoken';

/**
 * JWT Token Generation
 * Generates access and refresh token pair for authenticated users.
 */

export const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
};

export const generateTokenPair = (userId) => {
  return {
    token: generateAccessToken(userId),
    refreshToken: generateRefreshToken(userId),
  };
};
