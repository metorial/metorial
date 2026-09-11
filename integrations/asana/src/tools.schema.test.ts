import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { config } from './config';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Asana tool input schemas', provider.actions);

describe('Asana provider registration', () => {
  it('does not expose integration-level configuration', () => {
    expect(
      config.configSchema.parse({
        workspaceId: 'legacy-workspace',
        webhookProjectId: 'legacy-project'
      })
    ).toEqual({});
  });

  it('does not register triggers', () => {
    expect(provider.actions.filter(action => action.type === 'trigger')).toEqual([]);
  });
});
