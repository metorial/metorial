import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacySchemas from './legacy-input-schemas.json';

const legacy = [
  'list_candidates',
  'get_candidate',
  'create_candidate',
  'update_candidate',
  'list_applications',
  'get_application',
  'advance_application',
  'reject_application',
  'list_jobs',
  'get_job',
  'create_job',
  'list_offers',
  'list_users',
  'get_user',
  'list_departments',
  'list_offices',
  'list_scheduled_interviews',
  'add_candidate_note',
  'manage_candidate_tags'
];
describeMcpCompatibleToolSchemas('Greenhouse input schemas', provider.actions);
describe('Greenhouse preserved surface', () => {
  it('preserves all legacy keys with bounded additions and reserved renewal', () => {
    expect(provider.actions.map(action => action.key).sort()).toEqual(
      [
        ...legacy,
        'get_current_context',
        'list_rejection_reasons',
        'list_application_attachments',
        'download_application_attachment',
        'metorial$getFileUrl'
      ].sort()
    );
    expect(provider.actions.every(action => `greenhouse-${action.key}`.length < 60)).toBe(
      true
    );
    expect(provider.actions.filter(action => action.type !== 'tool')).toEqual([]);
  });
  for (const key of legacy)
    it(`preserves legacy ${key} field contracts`, () => {
      const action = provider.actions.find(action => action.key === key);
      expect(action).toBeDefined();
      const actual = z.toJSONSchema(action!.inputSchema) as Record<string, unknown>;
      const baseline = legacySchemas[key as keyof typeof legacySchemas] as Record<
        string,
        unknown
      >;
      const clean = (value: unknown): unknown =>
        Array.isArray(value)
          ? value.map(clean)
          : value && typeof value === 'object'
            ? Object.fromEntries(
                Object.entries(value)
                  .filter(([field]) => field !== 'description' && field !== '$schema')
                  .map(([field, entry]) => [field, clean(entry)])
              )
            : value;
      const actualProperties = actual.properties as Record<string, unknown>;
      const oldProperties = baseline.properties as Record<string, unknown>;
      for (const [field, original] of Object.entries(oldProperties))
        expect(clean(actualProperties[field])).toEqual(clean(original));
      expect(actual.required ?? []).toEqual(baseline.required ?? []);
    });
  it('keeps legacy optional write fields and enum values', () => {
    const tool = (key: string) => provider.actions.find(action => action.key === key);
    expect(
      tool('reject_application')?.inputSchema.safeParse({ applicationId: '1' }).success
    ).toBe(true);
    expect(tool('create_job')?.inputSchema.safeParse({ templateJobId: '1' }).success).toBe(
      true
    );
    for (const action of ['advance', 'move'])
      expect(
        tool('advance_application')?.inputSchema.safeParse({ applicationId: '1', action })
          .success
      ).toBe(true);
    for (const status of ['created', 'sent', 'accepted', 'rejected', 'deprecated'])
      expect(tool('list_offers')?.inputSchema.safeParse({ status }).success).toBe(true);
  });
});
