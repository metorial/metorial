import { describe, expect, it } from 'vitest';
import { documentMimeTypeSchema } from './schemas';

describe('Companies House shared schemas', () => {
  it('accepts an explicitly allowlisted document MIME type', () => {
    expect(documentMimeTypeSchema.safeParse('application/pdf').success).toBe(true);
  });

  it.each([
    'toString',
    'constructor',
    '__proto__'
  ])('rejects inherited object key %j as a document MIME type', mimeType => {
    expect(documentMimeTypeSchema.safeParse(mimeType).success).toBe(false);
  });
});
