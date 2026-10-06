import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { getErrorTrends, getStability, listEvents, manageProject } from './tools';

describeMcpCompatibleToolSchemas('Bugsnag tool input schemas', provider.actions);

describe('Bugsnag established contract compatibility', () => {
  it('retains all sixteen established tool keys', () => {
    const keys = provider.actions.map(action => action.key);
    for (const key of [
      'list_organizations',
      'list_projects',
      'get_project',
      'manage_project',
      'list_errors',
      'get_error',
      'update_error',
      'list_events',
      'get_event',
      'get_error_trends',
      'list_releases',
      'manage_collaborators',
      'manage_comments',
      'get_stability',
      'get_pivots',
      'manage_saved_searches'
    ])
      expect(keys).toContain(key);
  });
  it('keeps existing numeric inputs and all event/trend enum values', () => {
    const events = z.toJSONSchema(listEvents.inputSchema);
    expect(events.properties?.perPage).toMatchObject({ type: 'number' });
    expect(events.properties?.sort).toMatchObject({
      enum: expect.arrayContaining(['last_seen', 'first_seen', 'unsorted'])
    });
    const trends = z.toJSONSchema(getErrorTrends.inputSchema);
    expect(trends.properties?.resolution).toMatchObject({
      enum: expect.arrayContaining(['1h', '2h', '6h', '12h', '1d', '2d', '7d'])
    });
  });
  it('retains unsupported legacy fields with explicit provider-limit guidance', () => {
    const project = z.toJSONSchema(manageProject.inputSchema);
    expect(project.properties?.releaseStages).toMatchObject({
      type: 'array',
      description: expect.stringContaining('cannot be changed')
    });
    const stability = z.toJSONSchema(getStability.inputSchema);
    expect(stability.properties?.releaseStage).toMatchObject({
      type: 'string',
      description: expect.stringContaining('omit')
    });
    expect(z.toJSONSchema(getErrorTrends.inputSchema).properties?.resolution).toMatchObject({
      description: expect.stringContaining('rejected with guidance')
    });
  });
});
