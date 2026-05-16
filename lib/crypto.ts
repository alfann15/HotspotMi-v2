import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const KEY = scryptSync(
  process.env.CRYPTO_KEY || 'hotspotmi-crypto-key-32chars-here',
  'hotspotmi-salt',
  32
);

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(data: string): string {
  const [ivHex, encHex] = data.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', KEY, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
