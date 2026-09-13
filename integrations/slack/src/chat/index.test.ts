import { describe, expect, it } from 'vitest';
import { slackChatAdapter, slackChatTools, slackChatTriggers } from './index';

describe('Slack chat adapter contract', () => {
  it('registers every Slack-supported chat action exactly once', () => {
    expect(slackChatTools).toHaveLength(28);
    expect(slackChatTriggers).toHaveLength(9);
    expect(slackChatAdapter.actions).toHaveLength(37);
    expect(new Set(slackChatAdapter.actions.map(action => action.key)).size).toBe(37);

    expect(slackChatAdapter.actions.map(action => action.key)).not.toEqual(
      expect.arrayContaining(['metorial_chat$command.list'])
    );
  });

  it('advertises Slack-native rich content, files, and channel features', () => {
    let capabilities = Object.fromEntries(
      slackChatAdapter.capabilities.map(capability => [capability.id, capability.value])
    );

    expect(capabilities).toMatchObject({
      message_send: true,
      inbound_message: true,
      content_markdown: true,
      content_tables: true,
      content_charts: true,
      attachment_file: true,
      message_ephemeral_native: true,
      channel_private: true,
      channel_shared: true,
      typing: true,
      command_freeform: true
    });
    expect(capabilities.command_read).toBeUndefined();
  });
});
