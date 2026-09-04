import { argon2id, argon2i, argon2d } from 'hash-wasm';
import { bytesToHex, hexToBytes, stringToBytes } from './argon2';
import { Argon2Variant } from '../types';

export interface FileCryptoProgress {
  stage: 'idle' | 'deriving_key' | 'encrypting' | 'decrypting' | 'verifying' | 'packing' | 'complete' | 'error';
  message: string;
  percent: number;
}

export interface VaultFileItem {
  data: ArrayBuffer | Uint8Array;
  fileName: string;
  mimeType: string;
  extension?: string;
  fileSize?: number;
}

export interface DecryptedVaultFile {
  blob: Blob;
  fileName: string;
  extension: string;
  mimeType: string;
  fileSize: number;
}

export interface EncryptionResult {
  encryptedBlob: Blob;
  encryptedFileName: string;
  originalFileName: string;
  originalExtension: string;
  originalSize: number;
  encryptedSize: number;
  saltHex: string;
  isCustomSalt: boolean;
  ivHex: string;
  comparisonHashHex: string;
  derivedKeyHex: string;
  argon2TimeMs: number;
  aesTimeMs: number;
  totalTimeMs: number;
  argon2Params: {
    variant: Argon2Variant;
    memorySizeKiB: number;
    iterations: number;
    parallelism: number;
  };
  isVault?: boolean;
  vaultName?: string;
  fileCount?: number;
  filesSummary?: { name: string; size: number; mime: string; ext: string }[];
}

export interface DecryptionResult {
  decryptedBlob: Blob;
  suggestedFileName: string;
  originalDetectedFileName: string;
  originalDetectedExtension: string;
  mimeType: string;
  originalSize: number;
  saltHex: string;
  comparisonHashHex: string;
  derivedKeyHex: string;
  argon2TimeMs: number;
  aesTimeMs: number;
  totalTimeMs: number;
  passwordMatched: boolean;
  argon2Params: {
    variant: Argon2Variant;
    memorySizeKiB: number;
    iterations: number;
    parallelism: number;
  };
  isVault: boolean;
  vaultName?: string;
  fileCount: number;
  files: DecryptedVaultFile[];
}

// Magic bytes: 'SF01' (CipherFlow version 1.0)
export const SF_MAGIC_BYTES = new Uint8Array([0x53, 0x46, 0x30, 0x31]); // "SF01"

// Inner payload signatures
export const SF_INNER_MAGIC_SINGLE = 0x53464d54; // 'SFMT' = CipherFlow Meta Single
export const SF_INNER_MAGIC_VAULT = 0x5346564c; // 'SFVL' = CipherFlow Vault Container

const VARIANT_MAP: Record<Argon2Variant, number> = {
  argon2id: 0,
  argon2i: 1,
  argon2d: 2,
};

const VARIANT_REV_MAP: Record<number, Argon2Variant> = {
  0: 'argon2id',
  1: 'argon2i',
  2: 'argon2d',
};

export interface CipherFlowHeaderInfo {
  isValid: boolean;
  error?: string;
  version: string;
  variant: Argon2Variant;
  memorySizeKiB: number;
  iterations: number;
  parallelism: number;
  salt: Uint8Array;
  saltHex: string;
  comparisonHash: Uint8Array;
  comparisonHashHex: string;
  iv: Uint8Array;
  ivHex: string;
  ciphertextOffset: number;
  ciphertextSize: number;
}

/**
 * Inspect the public metadata of a CipherFlow (.cf) container.
 * Crucial: Inner metadata (filenames, extensions, mime, content) is NOT accessible until decrypted.
 */
export function inspectCipherFlowHeader(buffer: ArrayBuffer): CipherFlowHeaderInfo {
  if (buffer.byteLength < 56) {
    return {
      isValid: false,
      error: 'File is too small to be a valid CipherFlow v1.0 (.cf) encrypted container.',
      version: '1.0',
      variant: 'argon2id',
      memorySizeKiB: 0,
      iterations: 0,
      parallelism: 0,
      salt: new Uint8Array(0),
      saltHex: '',
      comparisonHash: new Uint8Array(0),
      comparisonHashHex: '',
      iv: new Uint8Array(0),
      ivHex: '',
      ciphertextOffset: 0,
      ciphertextSize: 0,
    };
  }

  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Check Magic 'SF01'
  for (let i = 0; i < SF_MAGIC_BYTES.length; i++) {
    if (bytes[i] !== SF_MAGIC_BYTES[i]) {
      return {
        isValid: false,
        error: 'Invalid container signature. This file is not a CipherFlow v1.0 (.cf) archive.',
        version: 'Unknown',
        variant: 'argon2id',
        memorySizeKiB: 0,
        iterations: 0,
        parallelism: 0,
        salt: new Uint8Array(0),
        saltHex: '',
        comparisonHash: new Uint8Array(0),
        comparisonHashHex: '',
        iv: new Uint8Array(0),
        ivHex: '',
        ciphertextOffset: 0,
        ciphertextSize: 0,
      };
    }
  }

  let offset = SF_MAGIC_BYTES.length;

  // Argon2 Variant (1 byte)
  const variantCode = view.getUint8(offset);
  const variant = VARIANT_REV_MAP[variantCode] || 'argon2id';
  offset += 1;

  // Memory KiB (4 bytes uint32 BE)
  const memorySizeKiB = view.getUint32(offset, false);
  offset += 4;

  // Iterations (2 bytes uint16 BE)
  const iterations = view.getUint16(offset, false);
  offset += 2;

  // Parallelism (2 bytes uint16 BE)
  const parallelism = view.getUint16(offset, false);
  offset += 2;

  // Salt length & bytes (1 byte len + N bytes)
  const saltLen = view.getUint8(offset);
  offset += 1;
  if (offset + saltLen > buffer.byteLength) {
    return {
      isValid: false,
      error: 'Corrupted container header: Invalid salt length.',
      version: '1.0',
      variant,
      memorySizeKiB,
      iterations,
      parallelism,
      salt: new Uint8Array(0),
      saltHex: '',
      comparisonHash: new Uint8Array(0),
      comparisonHashHex: '',
      iv: new Uint8Array(0),
      ivHex: '',
      ciphertextOffset: 0,
      ciphertextSize: 0,
    };
  }
  const salt = bytes.slice(offset, offset + saltLen);
  offset += saltLen;

  // Comparison Tag / Argon2 Hash length & bytes (1 byte len + 32 bytes)
  const tagLen = view.getUint8(offset);
  offset += 1;
  if (offset + tagLen > buffer.byteLength) {
    return {
      isValid: false,
      error: 'Corrupted container header: Invalid hash length.',
      version: '1.0',
      variant,
      memorySizeKiB,
      iterations,
      parallelism,
      salt,
      saltHex: bytesToHex(salt),
      comparisonHash: new Uint8Array(0),
      comparisonHashHex: '',
      iv: new Uint8Array(0),
      ivHex: '',
      ciphertextOffset: 0,
      ciphertextSize: 0,
    };
  }
  const comparisonHash = bytes.slice(offset, offset + tagLen);
  offset += tagLen;

  // IV (1 byte len + 12 bytes)
  const ivLen = view.getUint8(offset);
  offset += 1;
  if (offset + ivLen > buffer.byteLength) {
    return {
      isValid: false,
      error: 'Corrupted container header: Invalid IV length.',
      version: '1.0',
      variant,
      memorySizeKiB,
      iterations,
      parallelism,
      salt,
      saltHex: bytesToHex(salt),
      comparisonHash,
      comparisonHashHex: bytesToHex(comparisonHash),
      iv: new Uint8Array(0),
      ivHex: '',
      ciphertextOffset: 0,
      ciphertextSize: 0,
    };
  }
  const iv = bytes.slice(offset, offset + ivLen);
  offset += ivLen;

  return {
    isValid: true,
    version: '1.0',
    variant,
    memorySizeKiB,
    iterations,
    parallelism,
    salt,
    saltHex: bytesToHex(salt),
    comparisonHash,
    comparisonHashHex: bytesToHex(comparisonHash),
    iv,
    ivHex: bytesToHex(iv),
    ciphertextOffset: offset,
    ciphertextSize: buffer.byteLength - offset,
  };
}

/**
 * Encrypt a Multi-File / Multi-Format Vault or Single File into a CipherFlow v1.0 (.cf) container.
 * Encrypts all file items AND their respective metadata (filenames, extensions, MIME types, sizes)
 * into a single unified .cf container.
 */
export async function encryptVaultCipherFlow(
  files: VaultFileItem[],
  vaultName: string,
  password: string,
  options: {
    variant: Argon2Variant;
    memorySizeKiB: number;
    iterations: number;
    parallelism: number;
    customSalt?: Uint8Array | null;
  },
  onProgress?: (progress: FileCryptoProgress) => void
): Promise<EncryptionResult> {
  const t0 = performance.now();

  if (!files || files.length === 0) {
    throw new Error('No files provided for vault encryption.');
  }

  const isMultiFile = files.length > 1;
  const sanitizedVaultName = (vaultName || (isMultiFile ? 'secure_vault' : files[0].fileName)).trim();

  onProgress?.({
    stage: 'deriving_key',
    message: `Executing ${options.variant} key derivation (m=${options.memorySizeKiB} KiB, t=${options.iterations}, p=${options.parallelism})...`,
    percent: 20,
  });

  // 1. Prepare Salt (Random 16-byte default or user-specified custom salt)
  const salt =
    options.customSalt && options.customSalt.length > 0
      ? options.customSalt
      : crypto.getRandomValues(new Uint8Array(16));

  // 2. Generate 12-byte random IV for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 3. Derive 64 bytes via Argon2:
  // - First 32 bytes = AES-256-GCM symmetric encryption key (secret)
  // - Next 32 bytes = Public Argon2 verification/comparison hash (for constant-time verification)
  const hashFn =
    options.variant === 'argon2i'
      ? argon2i
      : options.variant === 'argon2d'
      ? argon2d
      : argon2id;

  const tArgonStart = performance.now();
  const rawArgon2Output = await hashFn({
    password: stringToBytes(password),
    salt: salt,
    iterations: options.iterations,
    memorySize: options.memorySizeKiB,
    hashLength: 64, // 64 bytes total
    parallelism: options.parallelism,
    outputType: 'binary',
  });
  const tArgonEnd = performance.now();
  const argon2TimeMs = Math.round((tArgonEnd - tArgonStart) * 100) / 100;

  const derivedAesKeyBytes = rawArgon2Output.slice(0, 32);
  const publicComparisonHashBytes = rawArgon2Output.slice(32, 64);

  onProgress?.({
    stage: 'packing',
    message: `Encapsulating vault payload (${files.length} ${files.length === 1 ? 'file' : 'files'})...`,
    percent: 50,
  });

  // 4. Pack Sensitive Inner Payload before encryption
  // If multi-file or vault mode, use SF_INNER_MAGIC_VAULT ('SFVL')
  // Inner Structure:
  // [4B] Inner Magic 0x5346564C ('SFVL')
  // [8B] Timestamp (Float64)
  // [2B] Vault Name Length (uint16)
  // [V B] Vault Name Bytes
  // [2B] File Count (uint16)
  // For each file:
  //   [2B] Name Length + [N B] Name Bytes
  //   [2B] Ext Length + [E B] Ext Bytes
  //   [2B] Mime Length + [M B] Mime Bytes
  //   [4B] File Size (uint32)
  //   [DATA B] Raw File Data Bytes

  const vaultNameBytes = stringToBytes(sanitizedVaultName);

  interface PreparedFile {
    nameBytes: Uint8Array;
    extBytes: Uint8Array;
    mimeBytes: Uint8Array;
    dataBytes: Uint8Array;
    rawSize: number;
    extStr: string;
    nameStr: string;
    mimeStr: string;
  }

  const preparedFiles: PreparedFile[] = [];
  let totalDataLength = 0;
  let totalHeaderLength = 4 + 8 + 2 + vaultNameBytes.length + 2; // Magic + Timestamp + VaultNameLen + VaultName + FileCount

  for (const f of files) {
    const extMatch = f.fileName.match(/\.([a-zA-Z0-9_-]+)$/);
    const extStr = f.extension || (extMatch ? `.${extMatch[1]}` : '');
    const nameBytes = stringToBytes(f.fileName || 'file.dat');
    const extBytes = stringToBytes(extStr);
    const mimeBytes = stringToBytes(f.mimeType || 'application/octet-stream');
    const dataBytes = f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data);

    preparedFiles.push({
      nameBytes,
      extBytes,
      mimeBytes,
      dataBytes,
      rawSize: dataBytes.byteLength,
      extStr,
      nameStr: f.fileName,
      mimeStr: f.mimeType || 'application/octet-stream',
    });

    totalDataLength += dataBytes.byteLength;
    totalHeaderLength += 2 + nameBytes.length + 2 + extBytes.length + 2 + mimeBytes.length + 4;
  }

  const innerPlaintextBuffer = new ArrayBuffer(totalHeaderLength + totalDataLength);
  const innerView = new DataView(innerPlaintextBuffer);
  const innerBytes = new Uint8Array(innerPlaintextBuffer);

  let innerOffset = 0;

  // Set Vault Magic 'SFVL'
  innerView.setUint32(innerOffset, SF_INNER_MAGIC_VAULT, false);
  innerOffset += 4;

  // Timestamp
  innerView.setFloat64(innerOffset, Date.now(), false);
  innerOffset += 8;

  // Vault Name
  innerView.setUint16(innerOffset, vaultNameBytes.length, false);
  innerOffset += 2;
  innerBytes.set(vaultNameBytes, innerOffset);
  innerOffset += vaultNameBytes.length;

  // File Count
  innerView.setUint16(innerOffset, preparedFiles.length, false);
  innerOffset += 2;

  // Append each file entry
  for (const pf of preparedFiles) {
    // Name
    innerView.setUint16(innerOffset, pf.nameBytes.length, false);
    innerOffset += 2;
    innerBytes.set(pf.nameBytes, innerOffset);
    innerOffset += pf.nameBytes.length;

    // Ext
    innerView.setUint16(innerOffset, pf.extBytes.length, false);
    innerOffset += 2;
    innerBytes.set(pf.extBytes, innerOffset);
    innerOffset += pf.extBytes.length;

    // Mime
    innerView.setUint16(innerOffset, pf.mimeBytes.length, false);
    innerOffset += 2;
    innerBytes.set(pf.mimeBytes, innerOffset);
    innerOffset += pf.mimeBytes.length;

    // Size
    innerView.setUint32(innerOffset, pf.rawSize, false);
    innerOffset += 4;

    // Data
    innerBytes.set(pf.dataBytes, innerOffset);
    innerOffset += pf.rawSize;
  }

  onProgress?.({
    stage: 'encrypting',
    message: 'Encrypting vault payload and metadata with AES-256-GCM authenticated cipher...',
    percent: 75,
  });

  // 5. AES-256-GCM Encryption
  const tAesStart = performance.now();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    derivedAesKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128,
    },
    cryptoKey,
    innerPlaintextBuffer
  );
  const tAesEnd = performance.now();
  const aesTimeMs = Math.round((tAesEnd - tAesStart) * 100) / 100;

  // 6. Build the Outer Public Container (.cf)
  const outerHeaderSize = 4 + 1 + 4 + 2 + 2 + 1 + salt.length + 1 + publicComparisonHashBytes.length + 1 + iv.length;
  const containerBuffer = new ArrayBuffer(outerHeaderSize + ciphertextBuffer.byteLength);
  const containerView = new DataView(containerBuffer);
  const containerBytes = new Uint8Array(containerBuffer);

  let outOffset = 0;

  // Magic 'SF01'
  containerBytes.set(SF_MAGIC_BYTES, outOffset);
  outOffset += SF_MAGIC_BYTES.length;

  // Variant
  containerView.setUint8(outOffset, VARIANT_MAP[options.variant] ?? 0);
  outOffset += 1;

  // Memory KiB
  containerView.setUint32(outOffset, options.memorySizeKiB, false);
  outOffset += 4;

  // Iterations
  containerView.setUint16(outOffset, options.iterations, false);
  outOffset += 2;

  // Parallelism
  containerView.setUint16(outOffset, options.parallelism, false);
  outOffset += 2;

  // Salt
  containerView.setUint8(outOffset, salt.length);
  outOffset += 1;
  containerBytes.set(salt, outOffset);
  outOffset += salt.length;

  // Public Comparison Hash
  containerView.setUint8(outOffset, publicComparisonHashBytes.length);
  outOffset += 1;
  containerBytes.set(publicComparisonHashBytes, outOffset);
  outOffset += publicComparisonHashBytes.length;

  // IV
  containerView.setUint8(outOffset, iv.length);
  outOffset += 1;
  containerBytes.set(iv, outOffset);
  outOffset += iv.length;

  // Encrypted Payload
  containerBytes.set(new Uint8Array(ciphertextBuffer), outOffset);

  const encryptedBlob = new Blob([containerBuffer], { type: 'application/octet-stream' });
  const totalTimeMs = Math.round((performance.now() - t0) * 100) / 100;

  // Generate .cf file name
  const cleanBase = sanitizedVaultName.replace(/\.[^/.]+$/, '');
  const encryptedFileName = `${cleanBase || 'vault_package'}.cf`;

  onProgress?.({
    stage: 'complete',
    message: `CipherFlow Vault Container (.cf) created with ${files.length} bundled files!`,
    percent: 100,
  });

  return {
    encryptedBlob,
    encryptedFileName,
    originalFileName: isMultiFile ? `${sanitizedVaultName} (${files.length} files)` : files[0].fileName,
    originalExtension: isMultiFile ? '.cf' : (preparedFiles[0]?.extStr || ''),
    originalSize: totalDataLength,
    encryptedSize: containerBuffer.byteLength,
    saltHex: bytesToHex(salt),
    isCustomSalt: !!options.customSalt && options.customSalt.length > 0,
    ivHex: bytesToHex(iv),
    comparisonHashHex: bytesToHex(publicComparisonHashBytes),
    derivedKeyHex: bytesToHex(derivedAesKeyBytes),
    argon2TimeMs,
    aesTimeMs,
    totalTimeMs,
    argon2Params: options,
    isVault: isMultiFile,
    vaultName: sanitizedVaultName,
    fileCount: files.length,
    filesSummary: preparedFiles.map((p) => ({
      name: p.nameStr,
      size: p.rawSize,
      mime: p.mimeStr,
      ext: p.extStr,
    })),
  };
}

/**
 * Encrypt a single file into a CipherFlow v1.0 (.cf) container.
 * Delegates to encryptVaultCipherFlow for unified packaging.
 */
export async function encryptFileCipherFlow(
  fileData: ArrayBuffer,
  fileName: string,
  mimeType: string,
  password: string,
  options: {
    variant: Argon2Variant;
    memorySizeKiB: number;
    iterations: number;
    parallelism: number;
    customSalt?: Uint8Array | null;
  },
  onProgress?: (progress: FileCryptoProgress) => void
): Promise<EncryptionResult> {
  return encryptVaultCipherFlow(
    [
      {
        data: fileData,
        fileName,
        mimeType,
      },
    ],
    fileName,
    password,
    options,
    onProgress
  );
}

/**
 * Decrypt a CipherFlow v1.0 (.cf) container (supports both single files and multi-file Vaults).
 * Authenticates with constant-time comparison, decrypts AES-256-GCM payload in volatile memory,
 * and recovers all files into browser RAM.
 */
export async function decryptFileCipherFlow(
  encryptedBuffer: ArrayBuffer,
  password: string,
  userCustomFileName?: string,
  onProgress?: (progress: FileCryptoProgress) => void
): Promise<DecryptionResult> {
  const t0 = performance.now();

  const header = inspectCipherFlowHeader(encryptedBuffer);
  if (!header.isValid) {
    throw new Error(header.error || 'Invalid CipherFlow container');
  }

  onProgress?.({
    stage: 'deriving_key',
    message: `Deriving keys via ${header.variant} (m=${header.memorySizeKiB} KiB, t=${header.iterations}, p=${header.parallelism})...`,
    percent: 25,
  });

  const hashFn =
    header.variant === 'argon2i'
      ? argon2i
      : header.variant === 'argon2d'
      ? argon2d
      : argon2id;

  const tArgonStart = performance.now();
  const rawArgon2Output = await hashFn({
    password: stringToBytes(password),
    salt: header.salt,
    iterations: header.iterations,
    memorySize: header.memorySizeKiB,
    hashLength: 64,
    parallelism: header.parallelism,
    outputType: 'binary',
  });
  const tArgonEnd = performance.now();
  const argon2TimeMs = Math.round((tArgonEnd - tArgonStart) * 100) / 100;

  const derivedAesKeyBytes = rawArgon2Output.slice(0, 32);
  const computedComparisonHash = rawArgon2Output.slice(32, 64);

  onProgress?.({
    stage: 'verifying',
    message: 'Performing constant-time comparison against header hash tag...',
    percent: 60,
  });

  // Constant-time comparison check
  let hashMatches = computedComparisonHash.length === header.comparisonHash.length;
  let diff = 0;
  for (let i = 0; i < header.comparisonHash.length; i++) {
    diff |= computedComparisonHash[i] ^ header.comparisonHash[i];
  }
  hashMatches = hashMatches && diff === 0;

  if (!hashMatches) {
    throw new Error(
      'Authentication Failed: Password does not match the Argon2 comparison hash embedded in the .cf container.'
    );
  }

  onProgress?.({
    stage: 'decrypting',
    message: 'Authenticating AES-256-GCM payload and unpacking secure inner metadata...',
    percent: 80,
  });

  const ciphertext = encryptedBuffer.slice(header.ciphertextOffset);

  const tAesStart = performance.now();
  try {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      derivedAesKeyBytes,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: header.iv,
        tagLength: 128,
      },
      cryptoKey,
      ciphertext
    );

    const tAesEnd = performance.now();
    const aesTimeMs = Math.round((tAesEnd - tAesStart) * 100) / 100;
    const totalTimeMs = Math.round((performance.now() - t0) * 100) / 100;

    const innerView = new DataView(decryptedBuffer);
    const innerBytes = new Uint8Array(decryptedBuffer);

    let innerOffset = 0;
    const magic = innerView.getUint32(innerOffset, false);
    innerOffset += 4;

    const extractedFiles: DecryptedVaultFile[] = [];
    let isVault = false;
    let vaultName = '';
    let primaryFileName = '';
    let primaryExtension = '';
    let primaryMimeType = '';
    let totalOriginalSize = 0;

    if (magic === SF_INNER_MAGIC_VAULT) {
      // -----------------------------------------------------------------
      // MULTI-FILE VAULT CONTAINER UNPACKING ('SFVL')
      // -----------------------------------------------------------------
      isVault = true;
      const timestamp = innerView.getFloat64(innerOffset, false);
      innerOffset += 8;

      // Vault Name
      const vNameLen = innerView.getUint16(innerOffset, false);
      innerOffset += 2;
      vaultName = new TextDecoder().decode(innerBytes.slice(innerOffset, innerOffset + vNameLen));
      innerOffset += vNameLen;

      // File Count
      const fileCount = innerView.getUint16(innerOffset, false);
      innerOffset += 2;

      for (let i = 0; i < fileCount; i++) {
        // Name
        const nameLen = innerView.getUint16(innerOffset, false);
        innerOffset += 2;
        const fName = new TextDecoder().decode(innerBytes.slice(innerOffset, innerOffset + nameLen));
        innerOffset += nameLen;

        // Ext
        const extLen = innerView.getUint16(innerOffset, false);
        innerOffset += 2;
        const fExt = new TextDecoder().decode(innerBytes.slice(innerOffset, innerOffset + extLen));
        innerOffset += extLen;

        // Mime
        const mimeLen = innerView.getUint16(innerOffset, false);
        innerOffset += 2;
        const fMime = new TextDecoder().decode(innerBytes.slice(innerOffset, innerOffset + mimeLen));
        innerOffset += mimeLen;

        // Size
        const fSize = innerView.getUint32(innerOffset, false);
        innerOffset += 4;

        // File Data Bytes
        const fileContent = decryptedBuffer.slice(innerOffset, innerOffset + fSize);
        innerOffset += fSize;

        const blob = new Blob([fileContent], { type: fMime || 'application/octet-stream' });

        extractedFiles.push({
          blob,
          fileName: fName,
          extension: fExt,
          mimeType: fMime,
          fileSize: fSize,
        });

        totalOriginalSize += fSize;
      }

      if (extractedFiles.length > 0) {
        primaryFileName = extractedFiles[0].fileName;
        primaryExtension = extractedFiles[0].extension;
        primaryMimeType = extractedFiles[0].mimeType;
      }
    } else if (magic === SF_INNER_MAGIC_SINGLE) {
      // -----------------------------------------------------------------
      // LEGACY / SINGLE FILE UNPACKING ('SFMT')
      // -----------------------------------------------------------------
      isVault = false;
      const timestamp = innerView.getFloat64(innerOffset, false);
      innerOffset += 8;

      // Ext
      const extLen = innerView.getUint16(innerOffset, false);
      innerOffset += 2;
      primaryExtension = new TextDecoder().decode(innerBytes.slice(innerOffset, innerOffset + extLen));
      innerOffset += extLen;

      // Filename
      const nameLen = innerView.getUint16(innerOffset, false);
      innerOffset += 2;
      primaryFileName = new TextDecoder().decode(innerBytes.slice(innerOffset, innerOffset + nameLen));
      innerOffset += nameLen;

      // Mime
      const mimeLen = innerView.getUint16(innerOffset, false);
      innerOffset += 2;
      primaryMimeType = new TextDecoder().decode(innerBytes.slice(innerOffset, innerOffset + mimeLen));
      innerOffset += mimeLen;

      // File size
      totalOriginalSize = innerView.getUint32(innerOffset, false);
      innerOffset += 4;

      // Raw File Content
      const fileContentBytes = decryptedBuffer.slice(innerOffset);
      const decryptedBlob = new Blob([fileContentBytes], {
        type: primaryMimeType || 'application/octet-stream',
      });

      extractedFiles.push({
        blob: decryptedBlob,
        fileName: primaryFileName,
        extension: primaryExtension,
        mimeType: primaryMimeType,
        fileSize: totalOriginalSize,
      });
    } else {
      throw new Error('Corrupted inner metadata signature in decrypted payload.');
    }

    let finalFileName = userCustomFileName?.trim() || primaryFileName || 'restored_file';
    if (userCustomFileName?.trim() && !userCustomFileName.includes('.') && primaryExtension) {
      finalFileName = `${userCustomFileName.trim()}${primaryExtension}`;
    }

    const primaryBlob = extractedFiles.length > 0 ? extractedFiles[0].blob : new Blob([]);

    onProgress?.({
      stage: 'complete',
      message: isVault
        ? `Vault Decrypted! ${extractedFiles.length} files successfully unlocked in volatile RAM!`
        : `File decrypted & authenticated! Metadata unlocked: ${primaryFileName}`,
      percent: 100,
    });

    return {
      decryptedBlob: primaryBlob,
      suggestedFileName: isVault ? `${vaultName || 'unlocked_vault'}` : finalFileName,
      originalDetectedFileName: primaryFileName,
      originalDetectedExtension: primaryExtension,
      mimeType: primaryMimeType,
      originalSize: totalOriginalSize,
      saltHex: header.saltHex,
      comparisonHashHex: header.comparisonHashHex,
      derivedKeyHex: bytesToHex(derivedAesKeyBytes),
      argon2TimeMs,
      aesTimeMs,
      totalTimeMs,
      passwordMatched: true,
      argon2Params: {
        variant: header.variant,
        memorySizeKiB: header.memorySizeKiB,
        iterations: header.iterations,
        parallelism: header.parallelism,
      },
      isVault,
      vaultName: vaultName || primaryFileName,
      fileCount: extractedFiles.length,
      files: extractedFiles,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Authentication Failed')) {
      throw err;
    }
    throw new Error(
      'Decryption Failed: Password mismatch or corrupted ciphertext (AES-GCM integrity authentication failed).'
    );
  }
}
