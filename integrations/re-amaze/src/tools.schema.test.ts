import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Re:amaze tool input schemas', provider.actions);

describe('Re:amaze tool schema registration', () => {
  it('registers all 35 unique tools with supported production IDs', () => {
    let tools = provider.actions.filter(action => action.type === 'tool');
    let keys = tools.map(tool => tool.key);
    expect(keys).toHaveLength(35);
    expect(new Set(keys).size).toBe(35);
    expect(keys).toEqual(
      expect.arrayContaining([
        'list_messages',
        'get_article',
        'get_channel',
        'get_response_template',
        'get_incident',
        'list_contact_identities',
        'create_contact_identity',
        'create_contact_identity_by_identifier',
        'update_contact_note'
      ])
    );
    for (let key of keys) expect(`reamaze-${key}`.length).toBeLessThan(60);
  });
});
