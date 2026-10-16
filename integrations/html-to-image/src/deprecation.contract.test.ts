import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import frozen from './legacy-delete-contract.json';

// Compatibility cannot be proved by live requests: retain the original public contract
// and handler while steering discovery to the acceptance-only replacement.
describe('HTML to Image deletion deprecation contract', () => {
  it('registers the frozen deprecated tool and its replacement', () => {
    let legacy = provider.actions.find(action => action.key === 'delete_images');
    let replacement = provider.actions.find(action => action.key === 'request_image_deletion');
    expect(legacy).toBeDefined();
    expect(replacement).toBeDefined();
    expect(legacy?.tags?.deprecated).toBe(true);
    expect(legacy?.description).toMatch(
      /^DEPRECATED — use `request_image_deletion` instead\./
    );
    expect(
      legacy?.instructions?.some(instruction => instruction.includes('request_image_deletion'))
    ).toBe(true);
    expect(replacement?.tags?.deprecated).not.toBe(true);
  });

  it('retains the exact baseline input/output schemas and handler', () => {
    let legacy = provider.actions.find(action => action.key === frozen.key)!;
    expect(z.toJSONSchema(legacy.inputSchema, { unrepresentable: 'any' })).toEqual(
      frozen.input
    );
    expect(z.toJSONSchema(legacy.outputSchema!, { unrepresentable: 'any' })).toEqual(
      frozen.output
    );
    let source = readFileSync(new URL('./tools/delete-images.ts', import.meta.url), 'utf8');
    expect(source.split('  .handleInvocation', 2)[1]).toBe(frozen.handlerSuffix);
  });
});
