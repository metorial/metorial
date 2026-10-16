import { readFileSync } from 'node:fs';
import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import frozen from './legacy-screenshot-contract.json';

// Paid captures cannot prove historical schema or source preservation. These
// contracts lock compatibility without making any provider requests.
describeMcpCompatibleToolSchemas('Piloterr tool input schemas', provider.actions);

describe('Piloterr screenshot deprecation', () => {
  it('registers both tools and directs new captures to the file tool', () => {
    let legacy = provider.actions.find(action => action.key === frozen.key)!;
    let replacement = provider.actions.find(action => action.key === 'capture_screenshot');
    expect(replacement).toBeDefined();
    expect(legacy.tags?.deprecated).toBe(true);
    expect(legacy.description).toMatch(/^DEPRECATED — use `capture_screenshot` instead\./);
    expect(
      legacy.instructions?.some(instruction => instruction.includes('capture_screenshot'))
    ).toBe(true);
  });

  it('preserves the exact original input, output, and handler', () => {
    let legacy = provider.actions.find(action => action.key === frozen.key)!;
    expect(z.toJSONSchema(legacy.inputSchema, { unrepresentable: 'any' })).toEqual(
      frozen.input
    );
    expect(z.toJSONSchema(legacy.outputSchema!, { unrepresentable: 'any' })).toEqual(
      frozen.output
    );
    let source = readFileSync(new URL('./tools/screenshot.ts', import.meta.url), 'utf8');
    expect(source.split('  .handleInvocation', 2)[1]).toBe(frozen.handlerSuffix);
  });

  it('keeps replacement output limited to capture and file metadata', () => {
    let replacement = provider.actions.find(action => action.key === 'capture_screenshot')!;
    let output = z.toJSONSchema(replacement.outputSchema!, { unrepresentable: 'any' });
    expect(Object.keys(output.properties ?? {}).sort()).toEqual([
      'deliveryWarning',
      'fileName',
      'filePreparation',
      'mimeType',
      'sizeBytes',
      'status'
    ]);
  });
});
