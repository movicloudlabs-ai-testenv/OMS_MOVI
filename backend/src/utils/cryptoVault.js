import crypto from 'crypto';

/**
 * ── AES-256-GCM FIELD-LEVEL CRYPTO VAULT ─────────────────────────────────────
 * Industry-standard authenticated symmetric encryption for secrets at rest.
 * Key: 256 bits (32 bytes) derived from environment.
 * IV: 16 bytes cryptographically strong random bytes per write.
 * Auth Tag: 16 bytes GCM authentication tag verifying ciphertext integrity.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const KEY_VERSION = 1;

/**
 * Derive 32-byte key from environment secret or SHA-256 digest
 */
function getEncryptionKey() {
  const secret = process.env.VAULT_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'movicloud-enterprise-vault-aes-256-master-key-seed';
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/**
 * Encrypt a plaintext secret
 * @param {string} plaintext
 * @returns {{ encryptedValue: string, iv: string, authTag: string, keyVersion: number }}
 */
export function encryptSecret(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext secret must be a non-empty string');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encryptedValue: encrypted,
    iv: iv.toString('hex'),
    authTag,
    keyVersion: KEY_VERSION,
  };
}

/**
 * Decrypt an encrypted secret using AES-256-GCM
 * @param {{ encryptedValue: string, iv: string, authTag: string }} secretRecord
 * @returns {string} plaintext
 */
export function decryptSecret({ encryptedValue, iv, authTag }) {
  if (!encryptedValue || !iv || !authTag) {
    throw new Error('Missing encryptedValue, iv, or authTag for decryption');
  }

  const key = getEncryptionKey();
  const ivBuffer = Buffer.from(iv, 'hex');
  const authTagBuffer = Buffer.from(authTag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTagBuffer);

  let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
