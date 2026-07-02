import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

export let attachmentActionEvents = SlateTrigger.create(spec, {
  name: 'Adaptive Card Submissions',
  key: 'attachment_action_events',
  description:
    'Triggers when a user submits an Adaptive Card (attachment action created) in Webex. Fetches the full submission data including form inputs.'
})
  .input(
    z.object({
      eventType: z.enum(['created']).describe('Type of attachment action event'),
      webhookPayload: z.any().describe('Raw webhook notification payload from Webex')
    })
  )
  .output(
    z.object({
      actionId: z.string().describe('ID of the attachment action'),
      messageId: z.string().optional().describe('ID of the message containing the card'),
      roomId: z.string().optional().describe('ID of the space'),
      personId: z.string().optional().describe('ID of the person who submitted the card'),
      type: z.string().optional().describe('Action type (e.g. submit)'),
      inputs: z.any().optional().describe('Form input values submitted by the user'),
      created: z.string().optional().describe('Timestamp of the submission')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new WebexClient({ token: ctx.auth.token });

      let webhook = await client.createWebhook({
        name: 'Slates Attachment Action created',
        targetUrl: ctx.input.webhookBaseUrl,
        resource: 'attachmentActions',
        event: 'created'
      });

      return {
        registrationDetails: { webhookIds: [webhook.id] }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WebexClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds || []) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;

      return {
        inputs: [
          {
            eventType: 'created' as const,
            webhookPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.webhookPayload;
      let resourceData = payload.data || {};

      // Fetch full attachment action details including form inputs
      let action = resourceData;
      if (resourceData.id) {
        try {
          let client = new WebexClient({ token: ctx.auth.token });
          action = await client.getAttachmentAction(resourceData.id);
        } catch {
          // Fall back to webhook data
        }
      }

      return {
        type: 'attachment_action.created',
        id: payload.id || resourceData.id || `action-${Date.now()}`,
        output: {
          actionId: action.id || resourceData.id,
          messageId: action.messageId || resourceData.messageId,
          roomId: action.roomId || resourceData.roomId,
          personId: action.personId || resourceData.personId,
          type: action.type,
          inputs: action.inputs,
          created: action.created || resourceData.created
        }
      };
    }
  })
  .build();
