import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { z } from 'zod';
import { provider } from './index';
import legacyContracts from './legacy-file-contracts.json';

// These local schema/deprecation contracts cannot be established by a live capture.
describe('ScreenshotOne file migration contracts', () => {
  it('keeps object-root schemas and unique production IDs shorter than 60 characters', () => {
    assert.equal(
      new Set(provider.actions.map(action => action.key)).size,
      provider.actions.length
    );
    for (let action of provider.actions) {
      if (action.type !== 'tool') continue;
      let schema = z.toJSONSchema(action.inputSchema, { unrepresentable: 'any' });
      assert.equal(schema.type, 'object');
      assert.equal(schema.anyOf, undefined);
      assert.equal(schema.oneOf, undefined);
      assert.equal(schema.allOf, undefined);
      assert.ok(`screenshotone-${action.key}`.length < 60);
    }
  });

  for (let [key, filename] of [
    ['take_screenshot', 'take-screenshot.ts'],
    ['generate_pdf', 'generate-pdf.ts']
  ] as const) {
    it(`preserves baseline ${key} schemas and handler alongside its content replacement`, () => {
      let legacy = provider.actions.find(action => action.key === key);
      let replacement = provider.actions.find(action => action.key === 'render_file');
      assert.ok(legacy);
      assert.ok(replacement);
      assert.equal(legacy.tags?.deprecated, true);
      assert.ok(legacy.description?.startsWith(' DEPRECATED — use `render_file` instead. '));
      assert.ok(legacy.instructions?.some(instruction => instruction.includes('render_file')));
      let baseline = legacyContracts[key];
      assert.deepEqual(
        z.toJSONSchema(legacy.inputSchema, { unrepresentable: 'any' }),
        baseline.input
      );
      assert.deepEqual(
        z.toJSONSchema(legacy.outputSchema, { unrepresentable: 'any' }),
        baseline.output
      );
      let source = readFileSync(new URL(`./tools/${filename}`, import.meta.url), 'utf8');
      let handler = source.slice(source.indexOf('  .handleInvocation'));
      // Exact source from c455f13e5899b077e59260226c1c56dd9e41c158; no provider invocation.
      assert.equal(createHash('sha256').update(handler).digest('hex'), baseline.handlerSha256);
    });
  }

  it('keeps metadata and vision complementary tools active', () => {
    for (let key of ['extract_metadata', 'analyze_with_vision']) {
      let tool = provider.actions.find(action => action.key === key);
      assert.ok(tool);
      assert.notEqual(tool.tags?.deprecated, true);
      assert.ok(tool.instructions?.some(instruction => instruction.includes('render_file')));
    }
  });
});
