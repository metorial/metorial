import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let messageEventTypes = [
  'thread.email_received',
  'thread.email_sent',
  'thread.slack_message_received',
  'thread.slack_message_sent',
  'thread.chat_received',
  'thread.chat_sent',
  'thread.note_created',
  'thread.discord_message_received',
  'thread.discord_message_sent',
  'thread.ms_teams_message_received',
  'thread.ms_teams_message_sent'
] as const;

export let messageEvents = SlateTrigger.create(spec, {
  name: 'Message Events',
  key: 'message_events',
  description:
    'Triggers when messaging events occur on threads: emails sent/received, Slack messages, chat messages, Discord messages, MS Teams messages, or internal notes created.'
})
  .input(
    z.object({
      eventType: z.string().describe('Webhook event type'),
      eventId: z.string().describe('Unique event ID'),
      timestamp: z.string().describe('Event timestamp (ISO 8601)'),
      workspaceId: z.string().describe('Workspace ID'),
      payload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      threadId: z.string().describe('Thread ID the message belongs to'),
      threadTitle: z.string().nullable().describe('Thread title'),
      channel: z
        .string()
        .describe('Message channel (email, slack, chat, discord, ms_teams, note)'),
      direction: z.string().describe('Message direction (received, sent, created)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (!messageEventTypes.includes(data.type)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: data.type,
            eventId: data.id,
            timestamp: data.timestamp,
            workspaceId: data.workspaceId,
            payload: data.payload
          }
        ]
      };
    },
    handleEvent: async ctx => {
      let payload = ctx.input.payload;
      let thread = payload?.thread;

      let channelMap: Record<string, { channel: string; direction: string }> = {
        'thread.email_received': { channel: 'email', direction: 'received' },
        'thread.email_sent': { channel: 'email', direction: 'sent' },
        'thread.slack_message_received': { channel: 'slack', direction: 'received' },
        'thread.slack_message_sent': { channel: 'slack', direction: 'sent' },
        'thread.chat_received': { channel: 'chat', direction: 'received' },
        'thread.chat_sent': { channel: 'chat', direction: 'sent' },
        'thread.note_created': { channel: 'note', direction: 'created' },
        'thread.discord_message_received': { channel: 'discord', direction: 'received' },
        'thread.discord_message_sent': { channel: 'discord', direction: 'sent' },
        'thread.ms_teams_message_received': { channel: 'ms_teams', direction: 'received' },
        'thread.ms_teams_message_sent': { channel: 'ms_teams', direction: 'sent' }
      };

      let info = channelMap[ctx.input.eventType] || {
        channel: 'unknown',
        direction: 'unknown'
      };

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          threadId: thread?.id ?? '',
          threadTitle: thread?.title ?? null,
          channel: info.channel,
          direction: info.direction
        }
      };
    }
  })
  .build();
