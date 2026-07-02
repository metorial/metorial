import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

export let webhookEventsTrigger = SlateTrigger.create(spec, {
  name: 'Instagram Webhook Events',
  key: 'webhook_events',
  description:
    'Receives real-time webhook notifications from Instagram for comments, mentions, story insights, and direct messages. Requires manual webhook configuration in the Meta Developer Dashboard.'
})
  .input(
    z.object({
      eventType: z
        .enum(['comment', 'mention', 'story_insights', 'message'])
        .describe('Type of webhook event'),
      eventId: z.string().describe('Unique event identifier'),
      commentId: z.string().optional().describe('Comment ID (for comment and mention events)'),
      mediaId: z.string().optional().describe('Related media ID'),
      commentText: z.string().optional().describe('Comment text'),
      senderId: z.string().optional().describe('Sender ID for messages'),
      recipientId: z.string().optional().describe('Recipient ID for messages'),
      messageText: z.string().optional().describe('Message text content'),
      messageId: z.string().optional().describe('Message ID for messaging events'),
      timestamp: z.string().optional().describe('Event timestamp'),
      storyMetrics: z
        .object({
          exits: z.number().optional(),
          replies: z.number().optional(),
          reach: z.number().optional(),
          tapsForward: z.number().optional(),
          tapsBack: z.number().optional(),
          impressions: z.number().optional()
        })
        .optional()
        .describe('Story insight metrics')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Type of event received'),
      commentId: z.string().optional().describe('Comment ID'),
      mediaId: z.string().optional().describe('Related media ID'),
      commentText: z.string().optional().describe('Comment text'),
      senderId: z.string().optional().describe('Message sender ID'),
      recipientId: z.string().optional().describe('Message recipient ID'),
      messageText: z.string().optional().describe('Message text'),
      messageId: z.string().optional().describe('Message ID'),
      timestamp: z.string().optional().describe('Event timestamp'),
      storyMetrics: z
        .object({
          exits: z.number().optional(),
          replies: z.number().optional(),
          reach: z.number().optional(),
          tapsForward: z.number().optional(),
          tapsBack: z.number().optional(),
          impressions: z.number().optional()
        })
        .optional()
        .describe('Story insight metrics')
    })
  )
  .webhook({
    // No autoRegisterWebhook — Instagram webhooks must be configured manually in Meta Developer Dashboard

    handleRequest: async ctx => {
      let request = ctx.request;

      // Handle Meta webhook verification challenge (GET request)
      if (request.method === 'GET') {
        let url = new URL(request.url);
        let mode = url.searchParams.get('hub.mode');
        let challenge = url.searchParams.get('hub.challenge');

        if (mode === 'subscribe' && challenge) {
          // Return empty inputs - the verification response is handled by the platform
          return { inputs: [] };
        }
        return { inputs: [] };
      }

      let body = (await request.json()) as any;
      let inputs: Array<{
        eventType: 'comment' | 'mention' | 'story_insights' | 'message';
        eventId: string;
        commentId?: string;
        mediaId?: string;
        commentText?: string;
        senderId?: string;
        recipientId?: string;
        messageText?: string;
        messageId?: string;
        timestamp?: string;
        storyMetrics?: {
          exits?: number;
          replies?: number;
          reach?: number;
          tapsForward?: number;
          tapsBack?: number;
          impressions?: number;
        };
      }> = [];

      if (!body.entry) return { inputs: [] };

      for (let entry of body.entry) {
        let entryId = entry.id;
        let entryTime = entry.time ? String(entry.time) : undefined;

        // Process changes array (comments, mentions, story_insights)
        if (entry.changes) {
          for (let change of entry.changes) {
            let field = change.field as string;
            let value = change.value;

            if (field === 'comments') {
              inputs.push({
                eventType: 'comment',
                eventId: value.id || `comment_${entryId}_${entryTime}`,
                commentId: value.id,
                mediaId: value.media?.id,
                commentText: value.text,
                timestamp: entryTime
                  ? new Date(Number(entryTime) * 1000).toISOString()
                  : undefined
              });
            } else if (field === 'mentions') {
              inputs.push({
                eventType: 'mention',
                eventId:
                  value.comment_id || value.media_id || `mention_${entryId}_${entryTime}`,
                commentId: value.comment_id,
                mediaId: value.media_id,
                timestamp: entryTime
                  ? new Date(Number(entryTime) * 1000).toISOString()
                  : undefined
              });
            } else if (field === 'story_insights') {
              inputs.push({
                eventType: 'story_insights',
                eventId: value.media_id || `story_${entryId}_${entryTime}`,
                mediaId: value.media_id,
                timestamp: entryTime
                  ? new Date(Number(entryTime) * 1000).toISOString()
                  : undefined,
                storyMetrics: {
                  exits: value.exits,
                  replies: value.replies,
                  reach: value.reach,
                  tapsForward: value.taps_forward,
                  tapsBack: value.taps_back,
                  impressions: value.impressions
                }
              });
            }
          }
        }

        // Process messaging events
        if (entry.messaging) {
          for (let msgEvent of entry.messaging) {
            let sender = msgEvent.sender?.id;
            let recipient = msgEvent.recipient?.id;
            let message = msgEvent.message;
            let msgTimestamp = msgEvent.timestamp
              ? new Date(Number(msgEvent.timestamp) * 1000).toISOString()
              : undefined;

            if (message) {
              inputs.push({
                eventType: 'message',
                eventId: message.mid || `msg_${sender}_${msgEvent.timestamp}`,
                senderId: sender,
                recipientId: recipient,
                messageText: message.text,
                messageId: message.mid,
                timestamp: msgTimestamp
              });
            }
          }
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let { input } = ctx;
      let typeMap: Record<string, string> = {
        comment: 'comment.created',
        mention: 'mention.created',
        story_insights: 'story.insights_available',
        message: 'message.received'
      };

      return {
        type: typeMap[input.eventType] || `instagram.${input.eventType}`,
        id: input.eventId,
        output: {
          eventType: input.eventType,
          commentId: input.commentId,
          mediaId: input.mediaId,
          commentText: input.commentText,
          senderId: input.senderId,
          recipientId: input.recipientId,
          messageText: input.messageText,
          messageId: input.messageId,
          timestamp: input.timestamp,
          storyMetrics: input.storyMetrics
        }
      };
    }
  })
  .build();
