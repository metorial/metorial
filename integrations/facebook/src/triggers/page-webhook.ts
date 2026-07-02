import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

export let pageWebhook = SlateTrigger.create(spec, {
  name: 'Page Webhook',
  key: 'page_webhook',
  description:
    'Receives real-time webhook notifications for Facebook Page events including feed changes (posts, comments, reactions), messages, lead generation, and mentions. Requires configuring a Facebook App webhook subscription and subscribing the Page via the subscribed_apps endpoint.',
  instructions: [
    'Configure the webhook callback URL and verify token in your Facebook App dashboard under Webhooks settings.',
    'Subscribe the Page to your app via the `/{page-id}/subscribed_apps` endpoint with relevant fields.',
    'Supported event types include: feed, messages, messaging_postbacks, leadgen, ratings, mention.'
  ]
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of the webhook event (e.g. feed, messages, leadgen)'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      pageId: z.string().describe('Page ID that received the event'),
      changeField: z.string().optional().describe('Specific field that changed'),
      changeValue: z.any().optional().describe('Changed value data'),
      senderId: z.string().optional().describe('ID of the user who triggered the event'),
      timestamp: z.number().optional().describe('Event timestamp'),
      rawEntry: z.any().describe('Full raw webhook entry data')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('Page ID that received the event'),
      eventField: z
        .string()
        .describe('Webhook field that triggered the event (e.g. feed, messages)'),
      changeField: z
        .string()
        .optional()
        .describe('Specific sub-field that changed (e.g. comments, reactions)'),
      changeValue: z.any().optional().describe('The changed value data'),
      senderId: z.string().optional().describe('User who triggered the event'),
      timestamp: z.number().optional().describe('Event timestamp'),
      rawEntry: z.any().describe('Full raw webhook entry for custom processing')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let request = ctx.request;

      // Handle Facebook webhook verification challenge
      if (request.method === 'GET') {
        let url = new URL(request.url);
        let mode = url.searchParams.get('hub.mode');
        let challenge = url.searchParams.get('hub.challenge');

        if (mode === 'subscribe' && challenge) {
          // Return empty inputs but the platform will need to handle the challenge response
          // The verification is handled by responding with the challenge
          return { inputs: [] };
        }
        return { inputs: [] };
      }

      let body = (await request.json()) as any;

      if (!body || body.object !== 'page') {
        return { inputs: [] };
      }

      let inputs: Array<{
        eventType: string;
        eventId: string;
        pageId: string;
        changeField?: string;
        changeValue?: any;
        senderId?: string;
        timestamp?: number;
        rawEntry: any;
      }> = [];

      for (let entry of body.entry || []) {
        let pageId = entry.id;
        let entryTime = entry.time;

        // Process changes (feed, ratings, mention, etc.)
        if (entry.changes) {
          for (let change of entry.changes) {
            inputs.push({
              eventType: change.field || 'unknown',
              eventId: `${pageId}_${change.field}_${entryTime}_${change.value?.post_id || change.value?.comment_id || change.value?.from?.id || Math.random().toString(36).slice(2)}`,
              pageId,
              changeField: change.field,
              changeValue: change.value,
              senderId: change.value?.from?.id,
              timestamp: entryTime,
              rawEntry: entry
            });
          }
        }

        // Process messaging events
        if (entry.messaging) {
          for (let messagingEvent of entry.messaging) {
            let eventType = messagingEvent.message ? 'messages' : 'messaging_postbacks';
            inputs.push({
              eventType,
              eventId: `${pageId}_${eventType}_${messagingEvent.timestamp || entryTime}_${messagingEvent.sender?.id || ''}`,
              pageId,
              changeField: eventType,
              changeValue: messagingEvent,
              senderId: messagingEvent.sender?.id,
              timestamp: messagingEvent.timestamp || entryTime,
              rawEntry: entry
            });
          }
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `page.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          pageId: ctx.input.pageId,
          eventField: ctx.input.eventType,
          changeField: ctx.input.changeField,
          changeValue: ctx.input.changeValue,
          senderId: ctx.input.senderId,
          timestamp: ctx.input.timestamp,
          rawEntry: ctx.input.rawEntry
        }
      };
    }
  })
  .build();
