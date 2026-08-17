import type { SlateAdapterToolDefinition } from '@slates/adapter';
import { SlateAuth, SlateConfig, SlateSpecification } from '@slates/provider';
import { z } from 'zod';
import type { Author } from './schema/channels/author';
import type { Channel } from './schema/channels/channel';
import type { Thread } from './schema/channels/thread';
import type { Message } from './schema/content/message';
import type { Command } from './schema/interactions/command';
import * as chatTools from './tools';
import * as chatTriggers from './triggers';

export let createTestSpec = () => {
  let config = SlateConfig.create(z.object({}));
  let auth = SlateAuth.create<{}>().output(z.object({}));

  return SlateSpecification.create({
    key: 'test-chat',
    name: 'Test Chat',
    config,
    auth
  });
};

export let dummyAuthor: Author = {
  userId: 'U1',
  userName: 'ada',
  fullName: 'Ada Lovelace',
  type: 'user',
  isMe: false
};

export let dummyChannel: Channel = {
  id: 'C1',
  type: 'public'
};

export let dummyThread: Thread = {
  id: 'T1',
  channelId: 'C1',
  type: 'conversation'
};

export let dummyMessage: Message = {
  id: 'm1',
  channelId: 'C1',
  author: dummyAuthor,
  body: { parts: [{ type: 'markdown', markdown: 'hello' }] },
  metadata: { sentAt: '2026-01-01T00:00:00.000Z', edited: false }
};

export let dummyCommand: Command = {
  name: 'weather',
  description: 'Look up the weather',
  usage: '[zip code]'
};

let eventTypeForTrigger = (key: string) =>
  key.startsWith('metorial_chat$') ? `chat.${key.slice('metorial_chat$'.length)}` : key;

export let listToolDefinitions = () =>
  Object.values(chatTools).filter(
    (value): value is SlateAdapterToolDefinition<any, any> =>
      typeof value === 'object' && value !== null && 'input' in value && 'key' in value
  );

export let stubAllTools = (spec: ReturnType<typeof createTestSpec>) =>
  listToolDefinitions().map(definition =>
    definition
      .implement(spec)
      .handleInvocation(async () => ({
        output: stubOutput(definition.key),
        message: 'ok'
      }))
      .build()
  );

export let stubAllTriggers = (spec: ReturnType<typeof createTestSpec>) =>
  Object.values(chatTriggers)
    .filter(
      (value): value is (typeof chatTriggers)[keyof typeof chatTriggers] =>
        typeof value === 'object' && value !== null && 'input' in value && 'key' in value
    )
    .map(definition =>
      definition
        .implement(spec)
        .webhook({
          handleRequest: async () => ({ inputs: [] }),
          handleEvent: async () => {
            let output = stubTriggerOutput(definition.key) as any;
            return {
              type: output.type ?? eventTypeForTrigger(definition.key),
              id: '1',
              output
            };
          }
        })
        .build()
    );

let stubOutput = (key: string): any => {
  if (key === 'metorial_chat$setup.get') {
    return {
      setupMarkdown: '# Setup\n\nCreate an app and paste the webhook URL.',
      title: 'Chat app setup',
      manifest: {
        type: 'Slack App Manifest',
        value: 'display_information:\n  name: Test Chat',
        format: 'yaml',
        filename: 'manifest.yaml'
      },
      links: [{ label: 'Slack API', url: 'https://api.slack.com/apps' }]
    };
  }
  if (
    key === 'metorial_chat$message.send' ||
    key === 'metorial_chat$message.edit' ||
    key === 'metorial_chat$message.get' ||
    key === 'metorial_chat$message.reply'
  ) {
    return { message: dummyMessage, channel: dummyChannel, thread: dummyThread };
  }
  if (key === 'metorial_chat$message.sendEphemeral') {
    return {
      message: dummyMessage,
      channel: dummyChannel,
      thread: dummyThread,
      usedFallback: false
    };
  }
  if (key === 'metorial_chat$message.list' || key === 'metorial_chat$message.search') {
    return { messages: [dummyMessage], channel: dummyChannel, thread: dummyThread };
  }
  if (key === 'metorial_chat$reaction.list') {
    return { reactions: [] };
  }
  if (key === 'metorial_chat$channel.list') {
    return { channels: [] };
  }
  if (key === 'metorial_chat$channel.get') {
    return { channel: { ...dummyChannel, workspaceId: 'W1' } };
  }
  if (key === 'metorial_chat$workspace.list') {
    return { workspaces: [] };
  }
  if (key === 'metorial_chat$workspace.get') {
    return { workspace: { id: 'W1' } };
  }
  if (key === 'metorial_chat$channel.members' || key === 'metorial_chat$user.search') {
    return { authors: [dummyAuthor] };
  }
  if (key === 'metorial_chat$thread.list') {
    return { threads: [] };
  }
  if (key === 'metorial_chat$thread.get') {
    return { thread: dummyThread, channel: dummyChannel };
  }
  if (key === 'metorial_chat$dm.openSingle') {
    return {
      channel: { id: 'D1', type: 'dm' },
      thread: { id: 'DT1', channelId: 'D1', type: 'dm' }
    };
  }
  if (key === 'metorial_chat$dm.openGroup') {
    return {
      channel: { id: 'G1', type: 'group_dm' },
      thread: { id: 'GT1', channelId: 'G1', type: 'dm' }
    };
  }
  if (key === 'metorial_chat$user.get') {
    return { author: dummyAuthor };
  }
  if (key === 'metorial_chat$file.upload') {
    return { attachment: { type: 'file', name: 'a.txt' } };
  }
  if (key === 'metorial_chat$file.download') {
    return {
      attachment: {
        type: 'file',
        name: 'a.txt',
        content: 'aGk=',
        encoding: 'base64'
      }
    };
  }
  if (key === 'metorial_chat$modal.open') {
    return { viewId: 'V1' };
  }
  if (key === 'metorial_chat$command.respond') {
    return { message: dummyMessage, channel: dummyChannel };
  }
  if (key === 'metorial_chat$command.list') {
    return { commands: [dummyCommand] };
  }
  return { ok: true };
};

let stubTriggerOutput = (key: string): any => {
  let type = eventTypeForTrigger(key);

  if (
    type === 'chat.message.received' ||
    type === 'chat.message.updated' ||
    type === 'chat.mention.received'
  ) {
    return {
      type,
      id: dummyMessage.id,
      message: dummyMessage,
      channel: dummyChannel,
      thread: dummyThread
    };
  }
  if (type === 'chat.message.deleted') {
    return {
      type,
      id: 'm1',
      channelId: 'C1',
      messageId: 'm1',
      channel: dummyChannel,
      thread: dummyThread
    };
  }
  if (type === 'chat.reaction.added' || type === 'chat.reaction.removed') {
    return {
      type,
      id: 'm1',
      messageId: 'm1',
      channelId: 'C1',
      emoji: { type: 'unicode', value: '👍' },
      author: dummyAuthor,
      message: dummyMessage,
      channel: dummyChannel,
      thread: dummyThread
    };
  }
  if (type === 'chat.action.invoked') {
    return {
      type,
      id: 'approve',
      actionId: 'approve',
      messageId: 'm1',
      channelId: 'C1',
      author: dummyAuthor,
      message: dummyMessage,
      channel: dummyChannel,
      thread: dummyThread
    };
  }
  if (type === 'chat.modal.submitted') {
    return {
      type,
      id: 'cb',
      callbackId: 'cb',
      viewId: 'V1',
      values: {},
      author: dummyAuthor,
      channel: dummyChannel,
      thread: dummyThread
    };
  }
  if (type === 'chat.modal.closed') {
    return {
      type,
      id: 'cb',
      callbackId: 'cb',
      author: dummyAuthor,
      channel: dummyChannel
    };
  }
  if (type === 'chat.options.load') {
    return { type, id: 'sel', actionId: 'sel', query: 'a' };
  }
  if (type === 'chat.command.invoked') {
    return {
      type,
      id: 'weather',
      name: 'weather',
      text: '94107',
      author: dummyAuthor,
      channelId: 'C1',
      responseToken: 'rt-1',
      triggerId: 'trig-1',
      message: dummyMessage,
      channel: dummyChannel,
      thread: dummyThread
    };
  }
  if (type === 'chat.command.autocomplete') {
    return {
      type,
      id: 'weather',
      name: 'weather',
      optionName: 'zip',
      query: '94',
      author: dummyAuthor,
      channelId: 'C1'
    };
  }
  if (type === 'chat.member.joined' || type === 'chat.member.left') {
    return {
      type,
      id: dummyAuthor.userId,
      channelId: 'C1',
      author: dummyAuthor,
      channel: dummyChannel
    };
  }
  return { type, id: '1' };
};
