import { argon2id, argon2i, argon2d } from 'hash-wasm';
import { Argon2Params, Argon2Result, ParsedPHC } from '../types';

// Convert Uint8Array to hex
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b: number) => Number(b).toString(16).padStart(2, '0'))
    .join('');
}

// Check if string is valid hex
export function isValidHex(hex: string): boolean {
  const clean = hex.trim();
  return clean.length > 0 && clean.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(clean);
}

// Convert Hex to Uint8Array
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(Math.floor(cleanHex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Standard base64 without padding (used by Argon2 standard PHC)
export function bytesToBase64NoPad(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);
  return b64.replace(/=+$/, '');
}

// Base64 with padding
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Decode base64 (with or without padding)
export function base64ToBytes(b64: string): Uint8Array {
  let normalized = b64.replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4) {
    normalized += '=';
  }
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// String to UTF-8 bytes
export function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Resolve salt based on mode
export function resolveSalt(params: Pick<Argon2Params, 'saltMode' | 'customSalt'>): Uint8Array {
  switch (params.saltMode) {
    case 'rfc_minimal':
      // 8 zero-bytes per RFC 9106 minimal salt recommendation
      return new Uint8Array(8); // filled with 0s
    case 'empty':
      return new Uint8Array(0);
    case 'custom_text':
      return stringToBytes(params.customSalt || '');
    case 'custom_hex':
      return hexToBytes(params.customSalt || '');
    case 'random':
      return crypto.getRandomValues(new Uint8Array(16));
    default:
      return new Uint8Array(8);
  }
}

// Compute Argon2 Hash
export async function computeArgon2(params: Argon2Params): Promise<Argon2Result> {
  const startTime = performance.now();

  // Resolve secret
  let passwordBytes: Uint8Array;
  if (params.isSecretHex) {
    passwordBytes = hexToBytes(params.secret);
  } else {
    passwordBytes = stringToBytes(params.secret);
  }

  // Resolve salt
  const saltBytes = params.saltBytes || resolveSalt(params);

  const hashFn =
    params.variant === 'argon2i'
      ? argon2i
      : params.variant === 'argon2d'
      ? argon2d
      : argon2id;

  // Run hash-wasm
  const rawBytes = await hashFn({
    password: passwordBytes,
    salt: saltBytes,
    iterations: params.iterations,
    memorySize: params.memorySizeKiB,
    hashLength: params.hashLengthBytes,
    parallelism: params.parallelism,
    outputType: 'binary',
  });

  const endTime = performance.now();
  const rawHex = bytesToHex(rawBytes);
  const rawBase64 = bytesToBase64(rawBytes);
  const saltHex = bytesToHex(saltBytes);
  const saltBase64 = bytesToBase64(saltBytes);

  // Build standard Modular Crypt Format (PHC string)
  // Format: $argon2id$v=19$m=<m>,t=<t>,p=<p>$<b64_salt_nopad>$<b64_hash_nopad>
  const saltB64NoPad = bytesToBase64NoPad(saltBytes);
  const hashB64NoPad = bytesToBase64NoPad(rawBytes);
  const encodedString = `$${params.variant}$v=19$m=${params.memorySizeKiB},t=${params.iterations},p=${params.parallelism}$${saltB64NoPad}$${hashB64NoPad}`;

  return {
    rawHex,
    rawBase64,
    rawBytes,
    saltBytes,
    saltHex,
    saltBase64,
    encodedString,
    executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
    memoryUsedMb: Math.round((params.memorySizeKiB / 1024) * 100) / 100,
    timestamp: new Date().toISOString(),
  };
}

// Parse PHC String
export function parsePHCString(encoded: string): ParsedPHC {
  const trimmed = encoded.trim();
  if (!trimmed.startsWith('$')) {
    return { valid: false, variant: '', error: 'Hash must start with $' };
  }

  const parts = trimmed.split('$').filter(Boolean);
  if (parts.length < 4) {
    return {
      valid: false,
      variant: '',
      error: 'Invalid PHC format. Expected format: $argon2id$v=19$m=...,t=...,p=...$salt$hash',
    };
  }

  const variant = parts[0];
  if (!['argon2id', 'argon2i', 'argon2d'].includes(variant)) {
    return { valid: false, variant, error: `Unsupported variant: ${variant}` };
  }

  let version: number | undefined;
  let paramsIndex = 1;

  if (parts[1].startsWith('v=')) {
    version = parseInt(parts[1].replace('v=', ''), 10);
    paramsIndex = 2;
  }

  const paramStr = parts[paramsIndex];
  if (!paramStr) {
    return { valid: false, variant, error: 'Missing parameters section' };
  }

  const paramMap = new Map<string, number>();
  paramStr.split(',').forEach((pair) => {
    const [k, v] = pair.split('=');
    if (k && v) {
      paramMap.set(k.trim(), parseInt(v.trim(), 10));
    }
  });

  const memoryCostKiB = paramMap.get('m');
  const timeCost = paramMap.get('t');
  const parallelism = paramMap.get('p');

  if (!memoryCostKiB || !timeCost || !parallelism) {
    return { valid: false, variant, error: 'Incomplete parameters (m, t, p required)' };
  }

  const saltBase64 = parts[paramsIndex + 1];
  const hashBase64 = parts[paramsIndex + 2];

  if (!saltBase64 || !hashBase64) {
    return { valid: false, variant, error: 'Missing salt or hash tag in PHC string' };
  }

  try {
    const rawSalt = base64ToBytes(saltBase64);
    const rawHash = base64ToBytes(hashBase64);

    return {
      valid: true,
      variant,
      version,
      memoryCostKiB,
      timeCost,
      parallelism,
      saltBase64,
      hashBase64,
      rawSalt,
      rawHash,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { valid: false, variant, error: `Base64 decoding failed: ${message}` };
  }
}

// Constant-time byte array comparison
export function constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
