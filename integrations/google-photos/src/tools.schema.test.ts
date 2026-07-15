import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { downloadMediaItem } from './tools';

describeMcpCompatibleToolSchemas('Google Photos tool input schemas', provider.actions);

describe('download_media_item input schema', () => {
  it('is a top-level object that requires only a media item ID', () => {
    let schema = z.toJSONSchema(downloadMediaItem.inputSchema) as {
      type?: string;
      properties?: Record<string, unknown>;
      required?: string[];
    };

    expect(schema.type).toBe('object');
    expect(Object.keys(schema.properties ?? {})).toEqual(['mediaItemId']);
    expect(schema.required).toEqual(['mediaItemId']);
    expect(schema).not.toHaveProperty('oneOf');
    expect(schema).not.toHaveProperty('anyOf');
    expect(schema).not.toHaveProperty('allOf');
  });
});
