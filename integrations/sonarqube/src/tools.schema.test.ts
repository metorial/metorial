import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('SonarQube tool input schemas', provider.actions);

describe('SonarQube search issue schema', () => {
  let searchIssuesTool = provider.actions.find(action => action.key === 'search_issues');

  it('rejects unsupported security hotspot issue types', () => {
    let result = searchIssuesTool?.inputSchema.safeParse({
      types: ['SECURITY_HOTSPOT']
    });

    expect(result?.success).toBe(false);
  });

  it('accepts current issue status and software-quality filters', () => {
    let result = searchIssuesTool?.inputSchema.safeParse({
      types: ['VULNERABILITY'],
      issueStatuses: ['OPEN'],
      impactSoftwareQualities: ['SECURITY'],
      impactSeverities: ['HIGH']
    });

    expect(result?.success).toBe(true);
  });
});
