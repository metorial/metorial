import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';
import { slackEventsTriggerGroup } from './eventsTriggerGroup';

let slackMessageEvent = z
  .object({
    type: z.string(),
    channel: z.string(),
    ts: z.string(),
    user: z.string().optional(),
    text: z.string().optional(),
    thread_ts: z.string().optional(),
    subtype: z.string().optional(),
    bot_id: z.string().optional()
  })
  .loose();

let slackMessageChangedEvent = z
  .object({
    type: z.literal('message'),
    subtype: z.literal('message_changed'),
    channel: z.string(),
    ts: z.string(),
    message: z
      .object({
        ts: z.string(),
        text: z.string().optional(),
        user: z.string().optional(),
        thread_ts: z.string().optional()
      })
      .loose(),
    previous_message: z
      .object({
        text: z.string().optional(),
        user: z.string().optional()
      })
      .loose()
      .optional()
  })
  .loose();

let slackMessageDeletedEvent = z
  .object({
    type: z.literal('message'),
    subtype: z.literal('message_deleted'),
    channel: z.string(),
    ts: z.string(),
    deleted_ts: z.string(),
    previous_message: z
      .object({
        text: z.string().optional(),
        user: z.string().optional()
      })
      .loose()
      .optional()
  })
  .loose();

export let newMessage = SlateTrigger.create(spec, {
  name: 'New Message',
  key: 'new_message',
  description: 'Triggers when a new message is posted to a channel, DM, or group DM.'
})
  .scopes(slackActionScopes.messageEvents)
  .triggerGroup(slackEventsTriggerGroup)
  .input(slackMessageEvent)
  .output(
    z.object({
      messageTs: z.string().describe('Message timestamp'),
      channelId: z.string().describe('Channel ID where the message was posted'),
      text: z.string().optional().describe('Message text'),
      userId: z.string().optional().describe('User ID of the message author'),
      threadTs: z.string().optional().describe('Thread parent timestamp'),
      subtype: z.string().optional().describe('Message subtype'),
      botId: z.string().optional().describe('Bot ID if posted by a bot'),
      isThread: z.boolean().describe('Whether this message is a thread reply')
    })
  )
  .matches(payload => {
    let event = payload as { type?: unknown; subtype?: unknown; ts?: unknown; channel?: unknown };
    return (
      !!event &&
      event.type === 'message' &&
      event.subtype !== 'message_changed' &&
      event.subtype !== 'message_deleted' &&
      typeof event.ts === 'string' &&
      typeof event.channel === 'string'
    );
  })
  .map(async ctx => {
    let event = ctx.input;

    return {
      type: event.subtype ? `message.${event.subtype}` : 'message.new',
      id: `${event.channel}-${event.ts}`,
      output: {
        messageTs: event.ts,
        channelId: event.channel,
        text: event.text,
        userId: event.user,
        threadTs: event.thread_ts,
        subtype: event.subtype,
        botId: event.bot_id,
        isThread: !!event.thread_ts
      }
    };
  })
  .build();

export let messageEdited = SlateTrigger.create(spec, {
  name: 'Message Edited',
  key: 'message_edited',
  description: 'Triggers when an existing message is edited.'
})
  .scopes(slackActionScopes.messageEvents)
  .triggerGroup(slackEventsTriggerGroup)
  .input(slackMessageChangedEvent)
  .output(
    z.object({
      messageTs: z.string().describe('Timestamp of the edited message'),
      channelId: z.string().describe('Channel ID'),
      editedAt: z.string().describe('Timestamp of the edit event'),
      userId: z.string().optional().describe('User ID of the message author'),
      text: z.string().optional().describe('Message text after the edit'),
      previousText: z.string().optional().describe('Message text before the edit'),
      threadTs: z.string().optional().describe('Thread parent timestamp')
    })
  )
  .matches(payload => {
    let event = payload as { type?: unknown; subtype?: unknown };
    return !!event && event.type === 'message' && event.subtype === 'message_changed';
  })
  .map(async ctx => {
    let event = ctx.input;

    return {
      type: 'message.edited',
      id: `${event.channel}-${event.message.ts}-${event.ts}`,
      output: {
        messageTs: event.message.ts,
        channelId: event.channel,
        editedAt: event.ts,
        userId: event.message.user,
        text: event.message.text,
        previousText: event.previous_message?.text,
        threadTs: event.message.thread_ts
      }
    };
  })
  .build();

export let messageDeleted = SlateTrigger.create(spec, {
  name: 'Message Deleted',
  key: 'message_deleted',
  description: 'Triggers when a message is deleted.'
})
  .scopes(slackActionScopes.messageEvents)
  .triggerGroup(slackEventsTriggerGroup)
  .input(slackMessageDeletedEvent)
  .output(
    z.object({
      messageTs: z.string().describe('Timestamp of the deleted message'),
      channelId: z.string().describe('Channel ID'),
      deletedAt: z.string().describe('Timestamp of the delete event'),
      userId: z.string().optional().describe('User ID of the original message author'),
      previousText: z.string().optional().describe('Message text before deletion')
    })
  )
  .matches(payload => {
    let event = payload as { type?: unknown; subtype?: unknown };
    return !!event && event.type === 'message' && event.subtype === 'message_deleted';
  })
  .map(async ctx => {
    let event = ctx.input;

    return {
      type: 'message.deleted',
      id: `${event.channel}-${event.deleted_ts}-${event.ts}`,
      output: {
        messageTs: event.deleted_ts,
        channelId: event.channel,
        deletedAt: event.ts,
        userId: event.previous_message?.user,
        previousText: event.previous_message?.text
      }
    };
  })
  .build();
