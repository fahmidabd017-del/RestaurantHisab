/**
 * Secure hashing utility for passwords and security question answers
 * using Web Crypto API SHA-256 with salt.
 */
const SALT = 'RestaurantHisab_Secure_Salt_2026_bd';

export async function hashString(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const msgUint8 = new TextEncoder().encode(normalized + SALT);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyHash(input: string, storedHash: string): Promise<boolean> {
  const computed = await hashString(input);
  return computed === storedHash;
}
