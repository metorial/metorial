import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { inputSchema, type OfficialToolName, officialContract } from './lib/tools';

describeMcpCompatibleToolSchemas('Context.dev tool inputs', provider.actions);

describe('official MCP schema contract', () => {
  it('registers each of the 40 official tools exactly once', () => {
    const keys = provider.actions
      .filter(action => action.type === 'tool' && action.key !== 'metorial$getFileUrl')
      .map(action => action.key)
      .sort();
    expect(keys).toEqual(
      Object.keys(officialContract)
        .map(name => name.replaceAll('-', '_'))
        .sort()
    );
    for (const key of keys) expect(`context-dev-${key}`.length).toBeLessThan(60);
  });

  for (const name of Object.keys(officialContract) as OfficialToolName[]) {
    it(`preserves the published input contract for ${name}`, () => {
      const actual = inputSchema(name).toJSONSchema();
      delete actual.$schema;
      delete actual.additionalProperties;
      const expected: Record<string, unknown> = structuredClone(
        officialContract[name].inputSchema
      );
      delete expected.$schema;
      expect(actual).toEqual(expected);
    });
  }

  it('validates nested brand discriminators without flattening the body wrapper', () => {
    const schema = inputSchema('brand-retrieve-unified');
    expect(
      schema.safeParse({ body: { type: 'by_domain', domain: 'example.com' } }).success
    ).toBe(true);
    expect(schema.safeParse({ body: { type: 'by_domain' } }).success).toBe(false);
    expect(schema.safeParse({ body: { type: 'by_isin', isin: 'US0378331005' } }).success).toBe(
      false
    );
  });

  it('preserves nullable monitor webhook removal and optional false values', () => {
    expect(
      inputSchema('update-monitor').parse({ monitor_id: 'mon_test', webhook: null })
    ).toEqual({ monitor_id: 'mon_test', webhook: null });
    expect(
      inputSchema('brand-search').parse({ query: 'example', autocomplete: false })
    ).toMatchObject({ autocomplete: false });
  });

  it('rejects out-of-range limits and invalid screenshot branches', () => {
    expect(
      inputSchema('get-batch-results').safeParse({ batch_id: 'batch_test', limit: 0 }).success
    ).toBe(false);
    expect(
      inputSchema('web-scrape').safeParse({
        url: 'https://example.com',
        formats: { screenshot: true },
        screenshotParams: { area: { x: -1, y: 0, width: 10, height: 10 } }
      }).success
    ).toBe(false);
  });
});
