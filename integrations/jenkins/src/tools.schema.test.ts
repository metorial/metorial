import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Jenkins tool input schemas', provider.actions);

describe('Jenkins search build log input schema', () => {
  it('accepts maxLines above the runtime cap for bounded normalization', () => {
    let tool = provider.actions.find(action => action.key === 'search_build_log');

    expect(
      tool?.inputSchema.safeParse({
        jobFullName: 'folder/job',
        pattern: 'error',
        maxLines: 200000
      }).success
    ).toBe(true);
  });
});
