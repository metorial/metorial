import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let eventTypes = [
  'CONNECTION_REQUEST_SENT',
  'CONNECTION_REQUEST_ACCEPTED',
  'MESSAGE_SENT',
  'MESSAGE_REPLY_RECEIVED',
  'INMAIL_SENT',
  'INMAIL_REPLY_RECEIVED',
  'LIKED_POST',
  'VIEWED_PROFILE',
  'FOLLOW_SENT',
  'CAMPAIGN_COMPLETED',
  'LEAD_TAG_UPDATED'
] as const;

export let outreachEvents = SlateTrigger.create(spec, {
  name: 'Outreach Events',
  key: 'outreach_events',
  description:
    'Triggers when LinkedIn outreach events occur in HeyReach, including connection requests, messages, InMails, profile views, post likes, follows, campaign completions, and lead tag updates.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of outreach event'),
      webhookPayload: z.any().describe('Raw webhook payload from HeyReach')
    })
  )
  .output(
    z.object({
      eventType: z
        .string()
        .describe(
          'The type of outreach event (e.g., CONNECTION_REQUEST_SENT, MESSAGE_REPLY_RECEIVED)'
        ),
      campaignName: z
        .string()
        .optional()
        .describe('Name of the campaign associated with this event'),
      campaignId: z
        .number()
        .optional()
        .describe('ID of the campaign associated with this event'),
      leadProfileUrl: z.string().optional().describe('LinkedIn profile URL of the lead'),
      leadFirstName: z.string().optional().describe('First name of the lead'),
      leadLastName: z.string().optional().describe('Last name of the lead'),
      leadCompany: z.string().optional().describe('Company of the lead'),
      leadPosition: z.string().optional().describe('Job title of the lead'),
      leadEmail: z.string().optional().describe('Email address of the lead'),
      senderProfileUrl: z
        .string()
        .optional()
        .describe('LinkedIn profile URL of the sender account'),
      messageText: z
        .string()
        .optional()
        .describe('Message content (for message-related events)'),
      leadTag: z
        .string()
        .optional()
        .describe('Updated tag value (for lead tag update events)'),
      timestamp: z.string().optional().describe('Timestamp of the event'),
      rawPayload: z.any().optional().describe('Complete raw event payload')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let registeredWebhooks: Array<{ webhookId: number; eventType: string }> = [];

      for (let eventType of eventTypes) {
        try {
          let result = await client.createWebhook({
            webhookName: `Slates_${eventType}`,
            webhookUrl: ctx.input.webhookBaseUrl,
            eventType
          });

          let webhookId =
            result?.data?.id ?? result?.id ?? result?.data?.webhookId ?? result?.webhookId;
          if (webhookId) {
            registeredWebhooks.push({ webhookId, eventType });
          }
        } catch (_err) {
          // Some event types may not be available; continue registering others
        }
      }

      return {
        registrationDetails: { webhooks: registeredWebhooks }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        webhooks: Array<{ webhookId: number; eventType: string }>;
      };

      if (details?.webhooks) {
        for (let webhook of details.webhooks) {
          try {
            await client.deleteWebhook(webhook.webhookId);
          } catch (_err) {
            // Best effort cleanup
          }
        }
      }
    },

    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // HeyReach may send a single event or an array
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => ({
        eventType: event.eventType ?? event.event_type ?? event.type ?? 'UNKNOWN',
        webhookPayload: event
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.webhookPayload;
      let eventType = ctx.input.eventType;

      // Normalize the event type to a dot-separated format
      let normalizedType = eventType.toLowerCase().replace(/_/g, '.');

      // Extract a unique ID from the payload
      let eventId =
        payload?.id ??
        payload?.eventId ??
        payload?.event_id ??
        `${eventType}_${payload?.leadProfileUrl ?? payload?.profileUrl ?? ''}_${payload?.timestamp ?? Date.now()}`;

      return {
        type: normalizedType,
        id: String(eventId),
        output: {
          eventType,
          campaignName: payload?.campaignName ?? payload?.campaign_name ?? payload?.campaign,
          campaignId: payload?.campaignId ?? payload?.campaign_id,
          leadProfileUrl:
            payload?.leadProfileUrl ??
            payload?.profileUrl ??
            payload?.lead_profile_url ??
            payload?.linkedinUrl,
          leadFirstName: payload?.firstName ?? payload?.first_name ?? payload?.leadFirstName,
          leadLastName: payload?.lastName ?? payload?.last_name ?? payload?.leadLastName,
          leadCompany: payload?.companyName ?? payload?.company ?? payload?.leadCompany,
          leadPosition: payload?.position ?? payload?.title ?? payload?.leadPosition,
          leadEmail: payload?.emailAddress ?? payload?.email ?? payload?.leadEmail,
          senderProfileUrl: payload?.senderProfileUrl ?? payload?.sender_profile_url,
          messageText: payload?.message ?? payload?.messageText ?? payload?.text,
          leadTag: payload?.tag ?? payload?.leadTag ?? payload?.lead_tag,
          timestamp: payload?.timestamp ?? payload?.createdAt ?? payload?.created_at,
          rawPayload: payload
        }
      };
    }
  })
  .build();
