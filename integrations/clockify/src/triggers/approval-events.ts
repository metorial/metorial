import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let approvalEventTypes = ['NEW_APPROVAL_REQUEST', 'APPROVAL_REQUEST_STATUS_UPDATED'] as const;

let eventTypeMap: Record<string, string> = {
  NEW_APPROVAL_REQUEST: 'approval.created',
  APPROVAL_REQUEST_STATUS_UPDATED: 'approval.status_updated'
};

export let approvalEvents = SlateTrigger.create(spec, {
  name: 'Approval Events',
  key: 'approval_events',
  description: 'Triggered when approval requests are created or their status changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('Clockify webhook event type'),
      approval: z.any().describe('Approval request data from webhook payload')
    })
  )
  .output(
    z.object({
      approvalRequestId: z.string(),
      userId: z.string().optional(),
      status: z.string().optional(),
      periodStart: z.string().optional(),
      periodEnd: z.string().optional(),
      workspaceId: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId,
        dataRegion: ctx.config.dataRegion
      });

      let webhookIds: string[] = [];
      for (let eventType of approvalEventTypes) {
        let webhook = await client.createWebhook({
          name: `slates_${eventType}`,
          url: ctx.input.webhookBaseUrl,
          triggerEvent: eventType
        });
        webhookIds.push(webhook.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId,
        dataRegion: ctx.config.dataRegion
      });

      let details = ctx.input.registrationDetails as { webhookIds: string[] };
      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_e) {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.triggerEvent || data.eventType || 'UNKNOWN',
            approval: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let approval = ctx.input.approval;
      let approvalId = approval.id || approval.approvalRequestId || 'unknown';
      let mappedType =
        eventTypeMap[ctx.input.eventType] || `approval.${ctx.input.eventType.toLowerCase()}`;

      return {
        type: mappedType,
        id: `${ctx.input.eventType}_${approvalId}_${approval.changeDate || Date.now()}`,
        output: {
          approvalRequestId: approvalId,
          userId: approval.userId || undefined,
          status: approval.status?.state || approval.status || undefined,
          periodStart: approval.period?.start || undefined,
          periodEnd: approval.period?.end || undefined,
          workspaceId: approval.workspaceId || undefined
        }
      };
    }
  })
  .build();
