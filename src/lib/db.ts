import { set, get, del, keys } from 'idb-keyval';

export interface CipherFileRecord {
  id: string; // The file name
  file: File;
  size: number;
  dateAdded: number;
}

export const saveCipherFile = async (file: File) => {
  const record: CipherFileRecord = {
    id: file.name,
    file,
    size: file.size,
    dateAdded: Date.now(),
  };
  await set(`cf_${file.name}`, record);
};

export const listCipherFiles = async (): Promise<CipherFileRecord[]> => {
  const allKeys = await keys();
  const cfKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith('cf_'));
  
  const records: CipherFileRecord[] = [];
  for (const key of cfKeys) {
    const record = await get<CipherFileRecord>(key as string);
    if (record) {
      records.push(record);
    }
  }
  
  // Sort by date added, descending
  return records.sort((a, b) => b.dateAdded - a.dateAdded);
};

export const deleteCipherFile = async (filename: string) => {
  await del(`cf_${filename}`);
};
