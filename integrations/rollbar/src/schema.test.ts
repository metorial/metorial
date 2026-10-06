import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Rollbar tool input schemas', provider.actions);
describe('Rollbar retained schemas', () => {
  it('retains all original tool keys', () => {
    const keys = provider.actions.map(action => action.key);
    for (const key of [
      'list_items',
      'get_item',
      'update_item',
      'list_occurrences',
      'get_occurrence',
      'create_deploy',
      'list_deploys',
      'manage_project',
      'manage_team',
      'manage_team_members',
      'manage_team_projects',
      'run_rql_query',
      'get_metrics',
      'manage_notification_rules',
      'list_environments',
      'manage_access_tokens',
      'manage_service_links',
      'list_users',
      'get_version'
    ])
      expect(keys).toContain(key);
  });
  it('retains number schemas and the legacy archived enum', () => {
    for (const action of provider.actions) {
      if (action.type !== 'tool') continue;
      const input = z.toJSONSchema(action.inputSchema);
      for (const [key, field] of Object.entries(input.properties ?? {})) {
        if (
          [
            'itemId',
            'counter',
            'page',
            'projectId',
            'teamId',
            'userId',
            'serviceLinkId',
            'ruleId',
            'hours',
            'rateLimitWindowCount',
            'rateLimitWindowSize'
          ].includes(key)
        )
          expect(field).toMatchObject({ type: 'number' });
      }
      if (['list_items', 'update_item'].includes(action.key))
        expect(input.properties?.status).toMatchObject({
          enum: ['active', 'resolved', 'muted', 'archived']
        });
    }
  });
  it('keeps token secrets separate from public token identifiers', () => {
    const action = provider.actions.find(action => action.key === 'manage_access_tokens');
    if (!action || action.type !== 'tool') throw new Error('Token tool missing.');
    expect(z.toJSONSchema(action.inputSchema).properties).toMatchObject({
      tokenValue: { type: 'string' },
      tokenPublicId: { type: 'string' }
    });
    const token = z.toJSONSchema(action.outputSchema).properties?.accessToken;
    expect(token).toMatchObject({
      properties: { tokenValue: { type: 'string' }, publicId: { type: 'string' } }
    });
  });
});
