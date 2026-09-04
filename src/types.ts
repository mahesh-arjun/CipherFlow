export type Argon2Variant = 'argon2id' | 'argon2i' | 'argon2d';

export type SaltMode = 'rfc_minimal' | 'custom_text' | 'custom_hex' | 'random' | 'empty';

export interface Argon2Params {
  variant: Argon2Variant;
  secret: string;
  isSecretHex: boolean;
  memorySizeKiB: number; // in KiB (e.g. 65536 for 64 MiB)
  iterations: number; // time cost t
  parallelism: number; // threads p
  hashLengthBytes: number; // tag length in bytes (e.g. 4, 16, 32, 64)
  saltMode: SaltMode;
  customSalt: string;
  saltBytes?: Uint8Array;
  associatedData?: string;
  key?: string;
  version?: number; // 19 (0x13)
}

export interface Argon2Result {
  rawHex: string;
  rawBase64: string;
  rawBytes: Uint8Array;
  saltBytes: Uint8Array;
  saltHex: string;
  saltBase64: string;
  encodedString: string;
  executionTimeMs: number;
  memoryUsedMb: number;
  timestamp: string;
}

export interface ParsedPHC {
  valid: boolean;
  variant: string;
  version?: number;
  memoryCostKiB?: number;
  timeCost?: number;
  parallelism?: number;
  saltBase64?: string;
  hashBase64?: string;
  rawSalt?: Uint8Array;
  rawHash?: Uint8Array;
  error?: string;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  badge: string;
  params: {
    variant: Argon2Variant;
    secret: string;
    memorySizeKiB: number;
    iterations: number;
    parallelism: number;
    hashLengthBytes: number;
    saltMode: SaltMode;
    customSalt?: string;
  };
}
