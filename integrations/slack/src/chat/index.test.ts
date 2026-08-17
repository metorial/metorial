import { describe, expect, it } from 'vitest';
import { slackChatAdapter, slackChatTools, slackChatTriggers } from './index';

describe('Slack chat adapter contract', () => {
  it('registers every Slack-supported chat action exactly once', () => {
    expect(slackChatTools).toHaveLength(29);
    expect(slackChatTriggers).toHaveLength(13);
    expect(slackChatAdapter.actions).toHaveLength(42);
    expect(new Set(slackChatAdapter.actions.map(action => action.key)).size).toBe(42);

    expect(slackChatAdapter.actions.map(action => action.key)).not.toEqual(
      expect.arrayContaining([
        'metorial_chat$command.list',
        'metorial_chat$command.autocomplete'
      ])
    );
  });

  it('advertises Slack-native rich content, interactions, files, and channel features', () => {
    let capabilities = Object.fromEntries(
      slackChatAdapter.capabilities.map(capability => [capability.id, capability.value])
    );

    expect(capabilities).toMatchObject({
      message_send: true,
      inbound_message: true,
      interaction_modals: true,
      inbound_actions: true,
      content_markdown: true,
      content_tables: true,
      content_charts: true,
      attachment_file: true,
      action_external_selects: true,
      modal_number_input: true,
      message_ephemeral_native: true,
      channel_private: true,
      channel_shared: true,
      typing: true,
      command_freeform: true
    });
    expect(capabilities.command_read).toBeUndefined();
    expect(capabilities.command_autocomplete).toBeUndefined();
  });
});
