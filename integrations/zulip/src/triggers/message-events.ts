import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let messageEvents = SlateTrigger.create(spec, {
  name: 'Message Events',
  key: 'message_events',
  description: 'Triggers when new messages are sent in Zulip channels or as direct messages.'
})
  .input(
    z.object({
      messageId: z.number().describe('Unique message ID'),
      senderId: z.number().describe('User ID of the sender'),
      senderFullName: z.string().describe('Full name of the sender'),
      senderEmail: z.string().describe('Email of the sender'),
      type: z.string().describe('Message type: "stream" or "private"'),
      channelName: z.string().optional().describe('Channel name for channel messages'),
      channelId: z.number().optional().describe('Channel ID for channel messages'),
      topic: z.string().describe('Topic of the message'),
      content: z.string().describe('Rendered HTML content of the message'),
      timestamp: z.number().describe('Unix timestamp when the message was sent')
    })
  )
  .output(
    z.object({
      messageId: z.number().describe('Unique message ID'),
      senderId: z.number().describe('User ID of the sender'),
      senderFullName: z.string().describe('Full name of the sender'),
      senderEmail: z.string().describe('Email of the sender'),
      type: z.string().describe('Message type: "stream" or "private"'),
      channelName: z.string().optional().describe('Channel name for channel messages'),
      channelId: z.number().optional().describe('Channel ID for channel messages'),
      topic: z.string().describe('Topic of the message'),
      content: z.string().describe('Rendered HTML content of the message'),
      timestamp: z.number().describe('Unix timestamp when the message was sent')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        serverUrl: ctx.auth.serverUrl,
        email: ctx.auth.email,
        token: ctx.auth.token
      });

      let state = ctx.state as { queueId?: string; lastEventId?: number } | undefined;

      let queueId = state?.queueId;
      let lastEventId = state?.lastEventId ?? -1;

      // Register a new event queue if we don't have one
      if (!queueId) {
        try {
          let registration = await client.registerEventQueue({
            eventTypes: ['message'],
            allPublicStreams: true
          });
          queueId = registration.queue_id;
          lastEventId = registration.last_event_id;
        } catch (_err) {
          ctx.error('Failed to register event queue');
          return { inputs: [], updatedState: {} };
        }
      }

      // Poll for events (non-blocking)
      try {
        let eventsResult = await client.getEvents({
          queueId: queueId!,
          lastEventId,
          dontBlock: true
        });

        let events = eventsResult.events || [];
        let messageEvents = events.filter((e: any) => e.type === 'message');

        let newLastEventId = events.length > 0 ? events[events.length - 1].id : lastEventId;

        let inputs = messageEvents.map((e: any) => {
          let msg = e.message;
          return {
            messageId: msg.id,
            senderId: msg.sender_id,
            senderFullName: msg.sender_full_name,
            senderEmail: msg.sender_email,
            type: msg.type,
            channelName:
              typeof msg.display_recipient === 'string' ? msg.display_recipient : undefined,
            channelId: msg.stream_id,
            topic: msg.subject || '',
            content: msg.content,
            timestamp: msg.timestamp
          };
        });

        return {
          inputs,
          updatedState: {
            queueId,
            lastEventId: newLastEventId
          }
        };
      } catch (err: any) {
        // If the queue was garbage collected, reset state to re-register
        if (
          err?.response?.status === 400 &&
          err?.response?.data?.code === 'BAD_EVENT_QUEUE_ID'
        ) {
          ctx.warn('Event queue expired, will re-register on next poll');
          return { inputs: [], updatedState: {} };
        }
        throw err;
      }
    },

    handleEvent: async ctx => {
      return {
        type: `message.${ctx.input.type === 'stream' ? 'channel' : 'direct'}`,
        id: String(ctx.input.messageId),
        output: {
          messageId: ctx.input.messageId,
          senderId: ctx.input.senderId,
          senderFullName: ctx.input.senderFullName,
          senderEmail: ctx.input.senderEmail,
          type: ctx.input.type,
          channelName: ctx.input.channelName,
          channelId: ctx.input.channelId,
          topic: ctx.input.topic,
          content: ctx.input.content,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
