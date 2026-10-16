import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Happy Scribe tool input schemas', provider.actions);

describe('legacy export replacement contract', () => {
  it('registers the deprecated exporter and its asynchronous replacements', () => {
    let legacy = provider.actions.find(action => action.key === 'export_transcription');
    expect(legacy).toBeDefined();
    expect(legacy?.tags?.deprecated).toBe(true);
    expect(legacy?.description).toMatch(/^DEPRECATED — use `create_export` instead\./);
    for (let key of ['create_export', 'get_export', 'download_export']) {
      expect(provider.actions.find(action => action.key === key)).toBeDefined();
    }
  });

  it('retains the exact legacy invocation handler', () => {
    let source = readFileSync(
      new URL('./tools/export-transcription.ts', import.meta.url),
      'utf8'
    );
    let handler = source.slice(source.indexOf('  .handleInvocation('));
    expect(createHash('sha256').update(handler).digest('hex')).toBe(
      '3e01170097fe6408190ce593227edd526536aeebbb4ee1594ea7ca0f9db91864'
    );
  });
});
