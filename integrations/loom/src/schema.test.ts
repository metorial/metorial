import {
  describeMcpCompatibleToolSchemas,
  getMcpCompatibleToolSchemaCases
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { z } from './lib/client';

describeMcpCompatibleToolSchemas('Loom input schemas', provider);
describe('Loom retained contracts', () => {
  const tools = new Map(getMcpCompatibleToolSchemaCases(provider));
  it('retains exactly the three legacy public keys', () => {
    expect([...tools.keys()].sort()).toEqual([
      'generate_embed_code',
      'get_video_metadata',
      'replace_loom_urls'
    ]);
  });
  it('keeps every production ID under 60 characters', () => {
    for (const key of tools.keys()) expect(`loom-${key}`.length).toBeLessThan(60);
  });
  it('preserves every legacy input field in top-level object schemas', () => {
    for (const [key, fields] of [
      ['get_video_metadata', ['videoUrl', 'maxWidth', 'maxHeight']],
      [
        'generate_embed_code',
        ['videoUrl', 'width', 'height', 'hideTopBar', 'autoplay', 'startTime', 'format']
      ],
      ['replace_loom_urls', ['text']]
    ] as const) {
      const tool = tools.get(key);
      expect(tool).toBeDefined();
      if (!tool) continue;
      const schema = z.toJSONSchema(tool.inputSchema);
      expect(schema.type).toBe('object');
      for (const field of fields)
        expect(Object.keys(schema.properties ?? {})).toContain(field);
    }
  });
  it('retains both embed formats without requiring credentials', () => {
    const schema = tools.get('generate_embed_code')?.inputSchema;
    expect(
      schema?.safeParse({ videoUrl: 'https://www.loom.com/share/abc123', format: 'html' })
        .success
    ).toBe(true);
    expect(
      schema?.safeParse({ videoUrl: 'https://www.loom.com/share/abc123', format: 'url' })
        .success
    ).toBe(true);
  });
});
