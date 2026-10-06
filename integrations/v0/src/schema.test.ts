import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('v0 tool input schemas', provider.actions);

const replacements = {
  create_chat: 'create_current_chat',
  init_chat: 'import_current_chat',
  list_chats: 'list_current_chats',
  get_chat: 'get_current_chat',
  delete_chat: 'delete_current_chat',
  send_message: 'send_current_message'
};
describe('API v1 compatibility and migration contracts', () => {
  it('retains legacy pagination number types and deployment output string constraints', () => {
    const legacyList = provider.actions.find(action => action.key === 'list_chats');
    if (!legacyList || legacyList.type !== 'tool') throw new Error('Missing list_chats');
    const pagination = z.toJSONSchema(legacyList.inputSchema).properties;
    expect(pagination?.limit).toMatchObject({ type: 'number' });
    expect(pagination?.offset).toMatchObject({ type: 'number' });
    for (const key of ['create_deployment', 'get_deployment']) {
      const tool = provider.actions.find(action => action.key === key);
      if (!tool || tool.type !== 'tool' || !tool.outputSchema)
        throw new Error(`Missing ${key}`);
      const fields = z.toJSONSchema(tool.outputSchema).properties;
      for (const field of ['deploymentId', 'projectId', 'chatId', 'versionId'])
        expect(fields?.[field]).not.toHaveProperty('minLength');
    }
  });
  for (const [oldKey, newKey] of Object.entries(replacements)) {
    it(`${oldKey} stays available and directs new workflows to ${newKey}`, () => {
      const old = provider.actions.find(action => action.key === oldKey);
      expect(old).toBeDefined();
      expect(old?.tags?.deprecated).toBe(true);
      expect(old?.description).toContain(`DEPRECATED — use \`${newKey}\` instead.`);
      expect(provider.actions.some(action => action.key === newKey)).toBe(true);
    });
  }
});
