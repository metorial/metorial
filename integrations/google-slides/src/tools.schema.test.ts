import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { getSlideThumbnail } from './tools';

describeMcpCompatibleToolSchemas('Google Slides tool input schemas', provider.actions);

describe('get_slide_thumbnail input schema', () => {
  it('requires presentation and page IDs and exposes only supported size presets', () => {
    let schema = z.toJSONSchema(getSlideThumbnail.inputSchema) as {
      type?: string;
      properties?: Record<string, { enum?: string[] }>;
      required?: string[];
    };

    expect(schema.type).toBe('object');
    expect(Object.keys(schema.properties ?? {})).toEqual([
      'presentationId',
      'pageObjectId',
      'thumbnailSize'
    ]);
    expect(schema.required).toEqual(['presentationId', 'pageObjectId']);
    expect(schema.properties?.thumbnailSize?.enum).toEqual(['SMALL', 'MEDIUM', 'LARGE']);
  });
});
