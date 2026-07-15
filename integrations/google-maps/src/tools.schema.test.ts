import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { autocompleteTool, getPlacePhotoTool } from './tools';

describeMcpCompatibleToolSchemas('Google Maps tool input schemas', provider.actions);

describe('Google Maps Places tool schemas', () => {
  it.each([
    ['autocomplete', autocompleteTool.inputSchema],
    ['get_place_photo', getPlacePhotoTool.inputSchema]
  ])('%s has a top-level object input schema', (_toolKey, inputSchema) => {
    let schema = z.toJSONSchema(inputSchema) as Record<string, unknown>;

    expect(schema.type).toBe('object');
    expect(schema).not.toHaveProperty('oneOf');
    expect(schema).not.toHaveProperty('anyOf');
    expect(schema).not.toHaveProperty('allOf');
  });

  it('keeps the production tool IDs below the bridge limit', () => {
    expect('google-maps-autocomplete'.length).toBeLessThan(60);
    expect('google-maps-get_place_photo'.length).toBeLessThan(60);
  });
});
