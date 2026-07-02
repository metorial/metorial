import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { FigmaClient } from '../lib/client';
import { spec } from '../spec';

export let devModeStatusEvents = SlateTrigger.create(spec, {
  name: 'Dev Mode Status Changed',
  key: 'dev_mode_status_changed',
  description:
    'Triggers when the Dev Mode status of a layer changes in Figma. Fires when layers are marked as Ready for Dev, Completed, or when a Dev Status is cleared.'
})
  .input(
    z.object({
      eventType: z.string().describe('The Figma event type (DEV_MODE_STATUS_UPDATE)'),
      webhookId: z.string().optional().describe('ID of the webhook'),
      passcode: z.string().optional().describe('Passcode for verification'),
      timestamp: z.string().optional().describe('Event timestamp'),
      fileKey: z.string().optional().describe('Key of the file'),
      fileName: z.string().optional().describe('Name of the file'),
      nodeId: z.string().optional().describe('Node ID whose status changed'),
      status: z
        .string()
        .optional()
        .describe('New dev mode status (ready_for_dev, completed, or empty for cleared)'),
      changeMessage: z
        .string()
        .optional()
        .describe('Optional message provided with the status change'),
      triggeredBy: z
        .object({
          userId: z.string().optional(),
          handle: z.string().optional(),
          imageUrl: z.string().optional()
        })
        .optional()
        .describe('User who changed the status')
    })
  )
  .output(
    z.object({
      fileKey: z.string().describe('Key of the file'),
      fileName: z.string().optional().describe('Name of the file'),
      nodeId: z.string().optional().describe('Node ID whose status changed'),
      status: z.string().optional().describe('New dev mode status'),
      changeMessage: z.string().optional().describe('Message provided with the status change'),
      timestamp: z.string().optional().describe('When the status changed'),
      changedBy: z
        .object({
          userId: z.string().optional(),
          handle: z.string().optional(),
          imageUrl: z.string().optional()
        })
        .optional()
        .describe('User who changed the status')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new FigmaClient(ctx.auth.token);
      let passcode = generatePasscode();

      let webhook = await client.createWebhook({
        eventType: 'DEV_MODE_STATUS_UPDATE',
        teamId: '',
        endpoint: ctx.input.webhookBaseUrl,
        passcode,
        description: 'Slates dev mode status events'
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          passcode
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new FigmaClient(ctx.auth.token);
      let webhookId = ctx.input.registrationDetails?.webhookId;

      if (webhookId) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (data.event_type === 'PING') {
        return { inputs: [] };
      }

      let triggeredBy: any;
      if (data.triggered_by) {
        triggeredBy = {
          userId: data.triggered_by.id,
          handle: data.triggered_by.handle,
          imageUrl: data.triggered_by.img_url
        };
      }

      return {
        inputs: [
          {
            eventType: data.event_type,
            webhookId: data.webhook_id,
            passcode: data.passcode,
            timestamp: data.timestamp,
            fileKey: data.file_key,
            fileName: data.file_name,
            nodeId: data.node_id,
            status: data.status,
            changeMessage: data.change_message,
            triggeredBy
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'dev_mode.status_updated',
        id: `DEV_MODE_STATUS-${ctx.input.fileKey || 'unknown'}-${ctx.input.nodeId || 'unknown'}-${ctx.input.timestamp || Date.now()}`,
        output: {
          fileKey: ctx.input.fileKey || '',
          fileName: ctx.input.fileName,
          nodeId: ctx.input.nodeId,
          status: ctx.input.status,
          changeMessage: ctx.input.changeMessage,
          timestamp: ctx.input.timestamp,
          changedBy: ctx.input.triggeredBy
        }
      };
    }
  })
  .build();

let generatePasscode = (): string => {
  let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
