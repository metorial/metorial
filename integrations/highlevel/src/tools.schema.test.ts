import {
  describeMcpCompatibleToolSchemas,
  getMcpCompatibleToolSchemaCases
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('HighLevel tool input schemas', provider.actions);

describe('HighLevel schema surface', () => {
  const cases = getMcpCompatibleToolSchemaCases(provider.actions);
  it('includes all 37 tools and the branching workflow schemas', () => {
    expect(cases).toHaveLength(37);
    const keys = cases.map(([key]) => key);
    for (const key of [
      'contacts_get_contacts',
      'conversations_send_a_new_message',
      'emails_create_template',
      'socialmediaposting_create_post',
      'socialmediaposting_edit_post'
    ])
      expect(keys).toContain(key);
    expect(new Set(keys).size).toBe(37);
    for (const key of keys) expect(`highlevel-${key}`.length).toBeLessThan(60);
  });
});
