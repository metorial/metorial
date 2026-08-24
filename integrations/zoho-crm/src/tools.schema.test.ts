import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Zoho CRM tool input schemas', provider.actions);

describe('Zoho CRM search input', () => {
  let searchRecords = provider.actions.find(action => action.key === 'search_records');

  it('requires at least two characters for word search', () => {
    expect(searchRecords?.inputSchema.safeParse({ module: 'Leads', word: 'a' }).success).toBe(
      false
    );
    expect(searchRecords?.inputSchema.safeParse({ module: 'Leads', word: 'an' }).success).toBe(
      true
    );
  });
});
