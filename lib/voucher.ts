import { ProfileCode, PROFILE_DURATIONS } from './parser';

export interface VoucherGenerateOptions {
  count: number;
  profileCode: ProfileCode | string;
  prefix: string;
  price?: number;
  sameAsUsername?: boolean;
  usernameLength?: number;
  passwordLength?: number;
  format?: 'numeric' | 'alphanumeric' | 'alpha';
  existingUsernames?: Set<string>;
}

export interface GeneratedVoucher {
  username: string;
  password: string;
  comment: string;
  profile?: string;
}

const NUMERIC_CHARS = '0123456789';
const ALPHA_CHARS = 'abcdefghijklmnopqrstuvwxyz';
const UPPER_ALPHANUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateSecureString(length: number, charset: string): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map((byte) => charset[byte % charset.length]).join('');
}

export function generateUsername(length = 8, format: 'numeric' | 'alphanumeric' | 'alpha' = 'alphanumeric'): string {
  const charset = format === 'numeric' ? NUMERIC_CHARS : format === 'alpha' ? ALPHA_CHARS : UPPER_ALPHANUM;
  return generateSecureString(length, charset);
}

export function generatePassword(length = 8, format: 'numeric' | 'alphanumeric' | 'alpha' = 'alphanumeric'): string {
  return generateUsername(length, format);
}

export function buildVoucherComment(prefix: string, profileCode: string, price = 0): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return `vc-${prefix.toUpperCase()}-${timestamp}-${profileCode}-${price}-NEW`;
}

export function generateVouchers(options: VoucherGenerateOptions): GeneratedVoucher[] {
  const {
    count, profileCode, prefix, price = 0, sameAsUsername = false,
    usernameLength = 8, passwordLength = 8, format = 'alphanumeric',
    existingUsernames = new Set(),
  } = options;

  const vouchers: GeneratedVoucher[] = [];
  const generated = new Set<string>([...existingUsernames]);
  let attempts = 0;

  while (vouchers.length < count && attempts < count * 10) {
    attempts++;
    const username = generateUsername(usernameLength, format);
    if (generated.has(username)) continue;
    generated.add(username);
    const password = sameAsUsername ? username : generatePassword(passwordLength, format);
    vouchers.push({ username, password, comment: buildVoucherComment(prefix, profileCode, price) });
  }

  return vouchers;
}

export function estimateExpiry(profileCode: string, from?: Date): Date | null {
  const duration = PROFILE_DURATIONS[profileCode];
  if (!duration) return null;
  return new Date((from || new Date()).getTime() + duration * 1000);
}

export function formatVoucherForPrint(voucher: GeneratedVoucher & { profile?: string; ssid?: string }) {
  return {
    username: voucher.username,
    password: voucher.password,
    profile: voucher.profile || 'Standard',
    ssid: voucher.ssid || 'Hotspot',
    qrData: `WIFI:T:WPA;S:${voucher.ssid || 'Hotspot'};P:${voucher.password};;`,
  };
}
