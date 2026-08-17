import type { SlateAdapterToolDefinition } from '@slates/adapter';
import { SlateAuth, SlateConfig, SlateSpecification } from '@slates/provider';
import { z } from 'zod';
import type { Message } from './schema/content/message';
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

export let dummyAuthor = {
  userId: 'U1',
  userName: 'ada',
  fullName: 'Ada Lovelace',
  type: 'user' as const,
  isMe: false
};

export let dummyMessage: Message = {
  id: 'm1',
  channelId: 'C1',
  author: dummyAuthor,
  body: { parts: [{ type: 'markdown', markdown: 'hello' }] },
  metadata: { sentAt: '2026-01-01T00:00:00.000Z', edited: false }
};

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
          handleEvent: async () => ({
            type: definition.key,
            id: '1',
            output: stubTriggerOutput(definition.key) as any
          })
        })
        .build()
    );

let stubOutput = (key: string): any => {
  if (
    key === 'chat.message.send' ||
    key === 'chat.message.edit' ||
    key === 'chat.message.get' ||
    key === 'chat.message.reply'
  ) {
    return { message: dummyMessage };
  }
  if (key === 'chat.message.sendEphemeral') {
    return { message: dummyMessage, usedFallback: false };
  }
  if (key === 'chat.message.list' || key === 'chat.message.search') {
    return { messages: [dummyMessage] };
  }
  if (key === 'chat.message.schedule') {
    return {
      scheduledMessageId: 's1',
      postAt: '2026-01-01T00:00:00.000Z',
      channelId: 'C1'
    };
  }
  if (key === 'chat.message.permalink') {
    return { url: 'https://example.com/m1' };
  }
  if (key === 'chat.reaction.list') {
    return { reactions: [] };
  }
  if (key === 'chat.channel.list') {
    return { channels: [] };
  }
  if (key === 'chat.channel.get') {
    return { channel: { id: 'C1', workspaceId: 'W1', type: 'public' } };
  }
  if (key === 'chat.workspace.list') {
    return { workspaces: [] };
  }
  if (key === 'chat.workspace.get') {
    return { workspace: { id: 'W1' } };
  }
  if (key === 'chat.channel.members' || key === 'chat.user.search') {
    return { authors: [dummyAuthor] };
  }
  if (key === 'chat.thread.list') {
    return { threads: [] };
  }
  if (key === 'chat.thread.get') {
    return { thread: { id: 'T1', channelId: 'C1' } };
  }
  if (key === 'chat.dm.open') {
    return { channelId: 'D1' };
  }
  if (key === 'chat.user.get') {
    return { author: dummyAuthor };
  }
  if (key === 'chat.file.upload') {
    return { attachment: { type: 'file', name: 'a.txt' } };
  }
  if (key === 'chat.modal.open') {
    return { viewId: 'V1' };
  }
  return { ok: true };
};

let stubTriggerOutput = (key: string): any => {
  if (
    key === 'chat.message.received' ||
    key === 'chat.message.updated' ||
    key === 'chat.mention.received'
  ) {
    return { type: key, id: dummyMessage.id, message: dummyMessage };
  }
  if (key === 'chat.message.deleted') {
    return { type: key, id: 'm1', channelId: 'C1', messageId: 'm1' };
  }
  if (key === 'chat.reaction.added' || key === 'chat.reaction.removed') {
    return {
      type: key,
      id: 'm1',
      messageId: 'm1',
      channelId: 'C1',
      emoji: { type: 'unicode', value: '👍' },
      author: dummyAuthor
    };
  }
  if (key === 'chat.action.invoked') {
    return {
      type: key,
      id: 'approve',
      actionId: 'approve',
      messageId: 'm1',
      channelId: 'C1',
      author: dummyAuthor
    };
  }
  if (key === 'chat.modal.submitted') {
    return {
      type: key,
      id: 'cb',
      callbackId: 'cb',
      viewId: 'V1',
      values: {},
      author: dummyAuthor
    };
  }
  if (key === 'chat.modal.closed') {
    return { type: key, id: 'cb', callbackId: 'cb', author: dummyAuthor };
  }
  if (key === 'chat.options.load') {
    return { type: key, id: 'sel', actionId: 'sel', query: 'a' };
  }
  if (key === 'chat.member.joined' || key === 'chat.member.left') {
    return { type: key, id: dummyAuthor.userId, channelId: 'C1', author: dummyAuthor };
  }
  return { type: key, id: '1' };
};
