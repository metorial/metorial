import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { listProjects, manageUptime } from './tools';

describeMcpCompatibleToolSchemas('Honeybadger tool input schemas', provider.actions);

it('keeps legacy numeric schemas and public tool IDs compatible', () => {
  for (const tool of provider.actions) {
    expect(`honeybadger-${tool.key}`.length).toBeLessThan(60);
    expect(JSON.stringify(z.toJSONSchema(tool.inputSchema)), tool.key).not.toContain(
      '"type":"integer"'
    );
    expect(JSON.stringify(z.toJSONSchema(tool.outputSchema)), tool.key).not.toContain(
      '"type":"integer"'
    );
  }
});

it('keeps the legacy project credential field optional in the output contract', () => {
  expect(
    listProjects.outputSchema.safeParse({ projects: [{ projectId: 1, name: 'test' }] }).success
  ).toBe(true);
  expect(
    listProjects.outputSchema.safeParse({
      projects: [{ projectId: 1, name: 'test', projectToken: 'legacy' }]
    }).success
  ).toBe(true);
});

it('supports UUID uptime IDs without changing the legacy numeric field type', () => {
  const siteIdentifier = '9eed68bc-81ae-4e3b-8daf-3223fb85e59b';
  expect(
    manageUptime.outputSchema.safeParse({ success: true, site: { siteIdentifier } }).success
  ).toBe(true);
  expect(
    manageUptime.outputSchema.safeParse({
      success: true,
      site: { siteId: 1, siteIdentifier: '1' }
    }).success
  ).toBe(true);
  expect(
    manageUptime.outputSchema.safeParse({ success: true, site: { siteId: siteIdentifier } })
      .success
  ).toBe(false);
});
