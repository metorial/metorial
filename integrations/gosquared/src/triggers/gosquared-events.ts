import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GoSquaredClient } from '../lib/client';
import { spec } from '../spec';

export let gosquaredEvents = SlateTrigger.create(spec, {
  name: 'GoSquared Events',
  key: 'gosquared_events',
  description:
    'Triggered by GoSquared webhook notifications including Smart Group membership changes, traffic spike/dip alerts, and live chat messages.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of the webhook event'),
      eventId: z.string().describe('Unique identifier for this event'),
      version: z.string().optional().describe('Webhook payload version'),
      siteToken: z.string().optional().describe('GoSquared site token'),
      timestamp: z.string().optional().describe('Event timestamp'),
      person: z
        .record(z.string(), z.any())
        .optional()
        .describe('Person profile data if present'),
      concurrents: z
        .number()
        .optional()
        .describe('Number of concurrent visitors for traffic events'),
      triggeredAlert: z
        .record(z.string(), z.any())
        .optional()
        .describe('Alert details for traffic events'),
      siteDetails: z
        .record(z.string(), z.any())
        .optional()
        .describe('Site summary for traffic events'),
      snapshot: z
        .record(z.string(), z.any())
        .optional()
        .describe('Traffic snapshot for traffic events'),
      groupName: z
        .string()
        .optional()
        .describe('Smart Group name for group membership events'),
      boundary: z.string().optional().describe('"enter" or "exit" for Smart Group events'),
      chatMessage: z.record(z.string(), z.any()).optional().describe('Chat message details'),
      raw: z.record(z.string(), z.any()).optional().describe('Full raw payload')
    })
  )
  .output(
    z.object({
      personId: z.string().optional().describe('Person ID if available'),
      personName: z.string().optional().describe('Person name if available'),
      personEmail: z.string().optional().describe('Person email if available'),
      concurrents: z
        .number()
        .optional()
        .describe('Number of concurrent visitors (traffic events)'),
      groupName: z.string().optional().describe('Smart Group name (group membership events)'),
      boundary: z
        .string()
        .optional()
        .describe('Enter or exit boundary (group membership events)'),
      messageContent: z.string().optional().describe('Chat message content (chat events)'),
      messageFrom: z
        .string()
        .optional()
        .describe('Who sent the message: "client" or "agent" (chat events)'),
      siteToken: z.string().optional().describe('GoSquared site token'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new GoSquaredClient({
        token: ctx.auth.token,
        siteToken: ctx.config.siteToken
      });

      let result = await client.createWebhook(ctx.input.webhookBaseUrl, {
        name: 'Slates Integration Webhook'
      });

      let webhookId = result?.id || result?.webhookId;

      let triggerTypes = [
        'chat_message',
        'entered_smart_group',
        'exited_smart_group',
        'traffic_spike',
        'traffic_dip'
      ];

      for (let triggerType of triggerTypes) {
        try {
          await client.addWebhookTrigger(webhookId, triggerType);
        } catch (_e) {
          // Some trigger types may not be available; continue with others
        }
      }

      return {
        registrationDetails: { webhookId }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new GoSquaredClient({
        token: ctx.auth.token,
        siteToken: ctx.config.siteToken
      });

      let webhookId = (ctx.input.registrationDetails as any)?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let eventType = 'unknown';
      let eventId = '';
      let person = data.person;
      let groupName: string | undefined;
      let boundary: string | undefined;
      let chatMessage: Record<string, any> | undefined;
      let concurrents: number | undefined;

      if (data.person?.chat?.latest?.message) {
        eventType = 'chat_message';
        let msg = data.person.chat.latest.message;
        chatMessage = msg;
        eventId = msg.id || `chat_${data.timestamp || Date.now()}`;
      } else if (data.concurrents !== undefined && data.triggeredAlert) {
        let alertType = data.triggeredAlert?.type || 'traffic';
        eventType = alertType === 'dip' ? 'traffic_dip' : 'traffic_spike';
        concurrents = data.concurrents;
        eventId = `traffic_${data.timestamp || Date.now()}`;
      } else if (data.group || data.smartgroup || data.boundary) {
        boundary = data.boundary || (data.trigger === 'exited_smart_group' ? 'exit' : 'enter');
        groupName = data.group?.name || data.smartgroup?.name || data.groupName;
        eventType = boundary === 'exit' ? 'exited_smart_group' : 'entered_smart_group';
        eventId = `smartgroup_${person?.id || ''}_${groupName || ''}_${data.timestamp || Date.now()}`;
      } else {
        eventId = `gosquared_${data.timestamp || Date.now()}`;
      }

      return {
        inputs: [
          {
            eventType,
            eventId,
            version: data.version as string | undefined,
            siteToken: data.site_token as string | undefined,
            timestamp: data.timestamp as string | undefined,
            person,
            concurrents,
            triggeredAlert: data.triggeredAlert,
            siteDetails: data.siteDetails,
            snapshot: data.snapshot,
            groupName,
            boundary,
            chatMessage,
            raw: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let personId: string | undefined = ctx.input.person?.id as string | undefined;
      let personName: string | undefined = ctx.input.person?.name as string | undefined;
      let personEmail: string | undefined = ctx.input.person?.email as string | undefined;
      let messageContent: string | undefined = ctx.input.chatMessage?.content as
        | string
        | undefined;
      let messageFrom: string | undefined = ctx.input.chatMessage?.from as string | undefined;

      let type: string;
      switch (ctx.input.eventType) {
        case 'chat_message':
          type = 'chat.message';
          break;
        case 'traffic_spike':
          type = 'traffic.spike';
          break;
        case 'traffic_dip':
          type = 'traffic.dip';
          break;
        case 'entered_smart_group':
          type = 'smart_group.entered';
          break;
        case 'exited_smart_group':
          type = 'smart_group.exited';
          break;
        default:
          type = 'event.unknown';
      }

      return {
        type,
        id: ctx.input.eventId,
        output: {
          personId,
          personName,
          personEmail,
          concurrents: ctx.input.concurrents,
          groupName: ctx.input.groupName,
          boundary: ctx.input.boundary,
          messageContent,
          messageFrom,
          siteToken: ctx.input.siteToken,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
