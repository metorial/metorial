import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import { normalizeStorageReference } from './tools/files';

describe('SpareBank 1 Regnskap download_file', () => {
  it('trims the documented file StorageReference query id', () => {
    expect(normalizeStorageReference('  file-storage-reference  ')).toBe(
      'file-storage-reference'
    );
  });

  it('rejects blank StorageReference values before calling the file service', () => {
    expect(() => normalizeStorageReference('   ')).toThrow(ServiceError);
    expect(() => normalizeStorageReference('   ')).toThrow('storageReference is required');
  });
});
