import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import frozen from './legacy-contract.json';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

// Live requests cannot establish preservation of the original numeric public contracts
// and client behavior. These assertions protect the semantic replacement boundary.
describe('Timelink legacy numeric deprecation contracts', () => {
  for (const prior of frozen.actions) {
    it(`retains ${prior.key} and its current API replacement`, () => {
      const legacy = provider.actions.find(action => action.key === prior.key)!;
      const replacementKey =
        frozen.replacements[prior.key as keyof typeof frozen.replacements];
      const replacement = provider.actions.find(action => action.key === replacementKey);
      expect(legacy).toBeDefined();
      expect(replacement).toBeDefined();
      expect(legacy.tags?.deprecated).toBe(true);
      expect(
        legacy.description?.startsWith(`DEPRECATED — use \`${replacementKey}\` instead.`)
      ).toBe(true);
      expect(
        legacy.instructions?.some(instruction => instruction.includes(replacementKey))
      ).toBe(true);
      expect(replacement?.tags?.deprecated).not.toBe(true);
      expect(z.toJSONSchema(legacy.inputSchema, { unrepresentable: 'any' })).toEqual(
        prior.input
      );
      expect(z.toJSONSchema(legacy.outputSchema!, { unrepresentable: 'any' })).toEqual(
        prior.output
      );
    });
  }

  it('retains the exact original client routing, payload, and response behavior', () => {
    const source = readFileSync(new URL('./lib/client.ts', import.meta.url), 'utf8');
    expect(sha256(source)).toBe(frozen.clientSourceSha256);
  });

  for (const [file, hashes] of Object.entries(frozen.handlers)) {
    it(`retains the exact original invocation handlers in ${file}`, () => {
      const source = readFileSync(new URL(`./tools/${file}`, import.meta.url), 'utf8');
      const bodies = Array.from(
        source.matchAll(
          /\.handleInvocation\((async ctx => \{[\s\S]*?\n {2}\})\)\n {2}\.build/g
        ),
        match => sha256(match[1]!)
      );
      expect(bodies).toEqual(hashes);
    });
  }
});
