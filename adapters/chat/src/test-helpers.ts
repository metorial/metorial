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
    return { message: dummyMessage, channel: dummyChannel, thread: dummyThread };
  }
  if (key === 'chat.message.sendEphemeral') {
    return {
      message: dummyMessage,
      channel: dummyChannel,
      thread: dummyThread,
      usedFallback: false
    };
  }
  if (key === 'chat.message.list' || key === 'chat.message.search') {
    return { messages: [dummyMessage], channel: dummyChannel, thread: dummyThread };
  }
  if (key === 'chat.reaction.list') {
    return { reactions: [] };
  }
  if (key === 'chat.channel.list') {
    return { channels: [] };
  }
  if (key === 'chat.channel.get') {
    return { channel: { ...dummyChannel, workspaceId: 'W1' } };
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
    return { thread: dummyThread, channel: dummyChannel };
  }
  if (key === 'chat.dm.openSingle') {
    return {
      channel: { id: 'D1', type: 'dm' },
      thread: { id: 'DT1', channelId: 'D1', type: 'dm' }
    };
  }
  if (key === 'chat.dm.openGroup') {
    return {
      channel: { id: 'G1', type: 'group_dm' },
      thread: { id: 'GT1', channelId: 'G1', type: 'dm' }
    };
  }
  if (key === 'chat.user.get') {
    return { author: dummyAuthor };
  }
  if (key === 'chat.file.upload') {
    return { attachment: { type: 'file', name: 'a.txt' } };
  }
  if (key === 'chat.file.download') {
    return {
      attachment: {
        type: 'file',
        name: 'a.txt',
        content: 'aGk=',
        encoding: 'base64'
      }
    };
  }
  if (key === 'chat.modal.open') {
    return { viewId: 'V1' };
  }
  if (key === 'chat.command.respond') {
    return { message: dummyMessage, channel: dummyChannel };
  }
  if (key === 'chat.command.list') {
    return { commands: [dummyCommand] };
  }
  return { ok: true };
};

let stubTriggerOutput = (key: string): any => {
  if (
    key === 'chat.message.received' ||
    key === 'chat.message.updated' ||
    key === 'chat.mention.received'
  ) {
    return {
      type: key,
      id: dummyMessage.id,
      message: dummyMessage,
      channel: dummyChannel,
      thread: dummyThread
    };
  }
  if (key === 'chat.message.deleted') {
    return {
      type: key,
      id: 'm1',
      channelId: 'C1',
      messageId: 'm1',
      channel: dummyChannel,
      thread: dummyThread
    };
  }
  if (key === 'chat.reaction.added' || key === 'chat.reaction.removed') {
    return {
      type: key,
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
  if (key === 'chat.action.invoked') {
    return {
      type: key,
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
  if (key === 'chat.modal.submitted') {
    return {
      type: key,
      id: 'cb',
      callbackId: 'cb',
      viewId: 'V1',
      values: {},
      author: dummyAuthor,
      channel: dummyChannel,
      thread: dummyThread
    };
  }
  if (key === 'chat.modal.closed') {
    return {
      type: key,
      id: 'cb',
      callbackId: 'cb',
      author: dummyAuthor,
      channel: dummyChannel
    };
  }
  if (key === 'chat.options.load') {
    return { type: key, id: 'sel', actionId: 'sel', query: 'a' };
  }
  if (key === 'chat.command.invoked') {
    return {
      type: key,
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
  if (key === 'chat.command.autocomplete') {
    return {
      type: key,
      id: 'weather',
      name: 'weather',
      optionName: 'zip',
      query: '94',
      author: dummyAuthor,
      channelId: 'C1'
    };
  }
  if (key === 'chat.member.joined' || key === 'chat.member.left') {
    return {
      type: key,
      id: dummyAuthor.userId,
      channelId: 'C1',
      author: dummyAuthor,
      channel: dummyChannel
    };
  }
  return { type: key, id: '1' };
};
