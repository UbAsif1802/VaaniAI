const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt.
 * NEVER log the password or the hash.
 * @param {string} password 
 * @returns {Promise<string>}
 */
async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Invalid password provided for hashing');
  }
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a candidate plaintext password with a stored hash.
 * @param {string} password 
 * @param {string} hash 
 * @returns {Promise<boolean>}
 */
async function comparePassword(password, hash) {
  if (!password || !hash) {
    return false;
  }
  return await bcrypt.compare(password, hash);
}

module.exports = {
  hashPassword,
  comparePassword
};
