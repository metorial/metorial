import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, test } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Later tool input schemas', provider.actions);
test('preserves legacy keys and marks semantic replacements deprecated', () => {
  const keys = provider.actions.map(action => action.key);
  expect(keys).toHaveLength(7);
  expect(new Set(keys).size).toBe(7);
  expect(keys).toEqual(
    expect.arrayContaining([
      'get_instance',
      'list_campaigns',
      'list_reporting_groups',
      'get_performance_report',
      'list_instances',
      'list_campaigns_v2',
      'get_analytics'
    ])
  );
  for (const key of ['get_instance', 'list_campaigns', 'get_performance_report']) {
    const action = provider.actions.find(action => action.key === key);
    expect(action?.tags?.deprecated).toBe(true);
  }
});

for (const [key, fields] of Object.entries({
  get_instance: {},
  list_campaigns: { campaignId: 'string' },
  list_reporting_groups: { reportingGroupId: 'string', campaignId: 'string' },
  get_performance_report: {
    campaignId: 'string',
    reportingGroupId: 'string',
    startDate: 'string',
    endDate: 'string',
    groupBy: 'string'
  }
}))
  test(`preserves ${key} legacy input properties and optionality`, () => {
    const action = provider.actions.find(action => action.key === key);
    if (!action) throw new Error('Legacy action is missing.');
    const schema = z.toJSONSchema(action.inputSchema);
    expect(schema.type).toBe('object');
    expect(schema.required ?? []).toEqual([]);
    expect(Object.keys(schema.properties ?? {}).sort()).toEqual(Object.keys(fields).sort());
    for (const [field, type] of Object.entries(fields)) {
      const property = schema.properties?.[field];
      expect(typeof property === 'object' ? property.type : undefined).toBe(type);
    }
    if (key === 'get_performance_report')
      expect(
        typeof schema.properties?.groupBy === 'object'
          ? schema.properties.groupBy.enum
          : undefined
      ).toEqual(['year', 'quarter', 'month', 'week_monday', 'week_sunday', 'day']);
  });
