import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { uploadAudio } from './upload-audio';

describe('upload_audio schema', () => {
  it('uses an MCP-compatible top-level object schema', () => {
    let jsonSchema = z.toJSONSchema(uploadAudio.inputSchema) as Record<string, unknown>;

    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema).not.toHaveProperty('oneOf');
    expect(jsonSchema).not.toHaveProperty('anyOf');
    expect(jsonSchema).not.toHaveProperty('allOf');
  });
});
