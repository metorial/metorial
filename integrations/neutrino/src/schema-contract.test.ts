import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import baseline from './domain-lookup-baseline.json';
import { provider } from './index';
import { domainLookupTool } from './tools/domain-lookup';

describeMcpCompatibleToolSchemas('Neutrino tool input schemas', provider.actions);

describe('Domain detail replacement contract', () => {
  it('retains the legacy tool with its original schemas and a documented replacement', () => {
    let legacy = provider.actions.find(tool => tool.key === 'domain_lookup');
    let replacement = provider.actions.find(tool => tool.key === 'get_domain_details');
    expect(legacy).toBeDefined();
    expect(replacement).toBeDefined();
    expect(legacy?.tags?.deprecated).toBe(true);
    expect(legacy?.description).toMatch(/^DEPRECATED — use `get_domain_details` instead\./);
    expect(legacy?.instructions).toContain(
      'Use get_domain_details for documented domain registration, DNS, mail, website, and threat details.'
    );
    expect(z.toJSONSchema(domainLookupTool.inputSchema)).toEqual(baseline.input);
    expect(z.toJSONSchema(domainLookupTool.outputSchema)).toEqual(baseline.output);
  });

  it('keeps the complete original invocation handler frozen', () => {
    let source = readFileSync(new URL('./tools/domain-lookup.ts', import.meta.url), 'utf8');
    let handler = source.slice(source.indexOf('  .handleInvocation('));
    expect(createHash('sha256').update(handler).digest('hex')).toBe(
      '1c1e55344ce34c565c30e899f0603443ee07a0aab27f5db40885efcf5d564c99'
    );
  });
});

describe('Generated file output contracts', () => {
  for (let key of ['generate_qr_code', 'render_html', 'resize_image']) {
    it(`${key} distinguishes requested delivery from confirmed generation`, () => {
      let tool = provider.actions.find(action => action.key === key);
      expect(tool).toBeDefined();
      let output = {
        generated: true,
        filename: 'file.png',
        mimeType: 'image/png',
        size: 8,
        deliveryStatus: 'requested',
        deliveryWarning: 'Download availability is unconfirmed.'
      };
      expect(tool?.outputSchema.safeParse(output).success).toBe(true);
      expect(
        tool?.outputSchema.safeParse({ ...output, deliveryStatus: 'failed' }).success
      ).toBe(true);
      expect(
        tool?.outputSchema.safeParse({ ...output, deliveryStatus: 'prepared' }).success
      ).toBe(false);
    });
  }
});
