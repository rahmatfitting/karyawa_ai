import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

/**
 * Hashes a plaintext password using crypto scrypt with random salt
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

/**
 * Verifies a password against a stored salt:hash string
 */
export function verifyPassword(password: string, stored: string): boolean {
  if (!password || !stored) return false
  
  // If stored has salt:hash format
  if (stored.includes(':')) {
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) return false
    try {
      const verifyHash = scryptSync(password, salt, 64).toString('hex')
      return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'))
    } catch {
      return false
    }
  }

  // Fallback for simple equality (e.g. initial setup)
  return password === stored
}
