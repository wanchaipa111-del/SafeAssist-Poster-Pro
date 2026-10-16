// License & Trial Management for SafeAssist Poster Pro
// Using Cryptographic Salted Hashing for Device-Locked Lifetime Licenses

export const TRIAL_MAX_PROPERTIES = 2;

// Private cryptographic salt known only to this application's license authority
const PRIVATE_SALT = 'SAFEASSIST_PRO_77X99_SECRET_SALT_2026';

// Master Admin PIN to open the secret seller Key Generator dialog
export const ADMIN_MASTER_PIN = '889988';

const DEVICE_ID_KEY = 'safeassist_device_id';

/**
 * Returns a persistent unique Device ID for the client (e.g., SA-4821-9F3B).
 */
export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      const rand1 = Math.floor(1000 + Math.random() * 9000);
      const rand2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      id = `SA-${rand1}-${rand2}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'SA-8821-PRO1';
  }
}

/**
 * Generates a device-bound license key using Private Salted Hashing.
 * Format: SA-VIP-XXXX-YYYY-ZZZZ
 */
export function generateLicenseKey(deviceId: string): string {
  const cleanId = (deviceId || '').trim().toUpperCase();
  const payload = `${cleanId}:${PRIVATE_SALT}:LIFETIME_VIP`;

  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x67452301;

  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c << 1), 0x27d4eb2f) >>> 0;
    h3 = Math.imul(h3 ^ (c << 2), 0x165667b1) >>> 0;
  }

  const part1 = ((h1 ^ (h2 >>> 16)) & 0xffff).toString(16).padStart(4, '0').toUpperCase();
  const part2 = ((h2 ^ (h3 >>> 16)) & 0xffff).toString(16).padStart(4, '0').toUpperCase();
  const part3 = ((h3 ^ (h1 >>> 16)) & 0xffff).toString(16).padStart(4, '0').toUpperCase();

  return `SA-VIP-${part1}-${part2}-${part3}`;
}

/**
 * Validates a user-provided license key against their Device ID.
 * Cryptographically locked to the device.
 */
export function validateLicenseKey(inputKey: string, deviceId: string): boolean {
  if (!inputKey || !deviceId) return false;
  const formatted = inputKey.trim().toUpperCase();
  const expectedKey = generateLicenseKey(deviceId);
  return formatted === expectedKey;
}
