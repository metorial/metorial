import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacy from './legacy-route-contract.json';

describeMcpCompatibleToolSchemas('Strava tool input schemas', provider.actions);

describe('Strava exact identifier schemas', () => {
  for (let [key, field, extra] of [
    ['get_route_details', 'routeId', {}],
    ['get_segment_effort', 'effortId', {}],
    ['get_segment_streams', 'segmentId', { streamTypes: ['distance'] }],
    ['list_activity_comments', 'activityId', {}]
  ] as const) {
    it(`${key} preserves decimal string IDs and rejects unsafe numeric IDs`, () => {
      let tool = provider.actions.find(action => action.key === key)!;
      let largeId = '12345678987654321';
      expect(tool.inputSchema.parse({ ...extra, [field]: largeId })).toMatchObject({
        [field]: largeId
      });
      expect(tool.inputSchema.safeParse({ ...extra, [field]: 12345 }).success).toBe(true);
      expect(tool.inputSchema.safeParse({ ...extra, [field]: Number(largeId) }).success).toBe(
        false
      );
      expect(tool.inputSchema.safeParse({ ...extra, [field]: '123/456' }).success).toBe(false);
    });
  }
});

// Schema and exact legacy-source retention require local contract assertions.
describe('Strava route export migration', () => {
  it('retains the original tool contract beside its downloadable replacement', () => {
    let old = provider.actions.find(action => action.key === 'get_route');
    let replacement = provider.actions.find(action => action.key === 'get_route_details');
    expect(old).toBeDefined();
    expect(replacement).toBeDefined();
    expect(old?.tags?.deprecated).toBe(true);
    expect(
      old?.description?.startsWith(' DEPRECATED — use `get_route_details` instead. ')
    ).toBe(true);
    expect(
      old?.instructions?.some(instruction => instruction.includes('get_route_details'))
    ).toBe(true);
    expect(z.toJSONSchema(old!.inputSchema, { unrepresentable: 'any' })).toEqual(legacy.input);
    expect(z.toJSONSchema(old!.outputSchema, { unrepresentable: 'any' })).toEqual(
      legacy.output
    );
    let source = readFileSync(new URL('./tools/get-route.ts', import.meta.url), 'utf8');
    let handler = source.slice(source.indexOf('  .handleInvocation'));
    expect(createHash('sha256').update(handler).digest('hex')).toBe(legacy.handlerSha256);
  });

  it('retains the legacy route request and response exchanges', () => {
    let client = readFileSync(new URL('./lib/client.ts', import.meta.url), 'utf8');
    for (let [method, hash] of Object.entries(legacy.clientMethods)) {
      let start = client.indexOf(`  async ${method}(`);
      let end = client.indexOf('\n  }', start) + 4;
      expect(createHash('sha256').update(client.slice(start, end)).digest('hex')).toBe(hash);
    }
  });

  it('keeps unique production IDs shorter than 60 characters', () => {
    expect(new Set(provider.actions.map(action => action.key)).size).toBe(
      provider.actions.length
    );
    for (let action of provider.actions)
      expect(`strava-${action.key}`.length).toBeLessThan(60);
  });
});
