import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let timeOffEventTypes = [
  'TIME_OFF_REQUESTED',
  'TIME_OFF_REQUEST_UPDATED',
  'TIME_OFF_REQUEST_APPROVED',
  'TIME_OFF_REQUEST_REJECTED',
  'TIME_OFF_REQUEST_WITHDRAWN',
  'BALANCE_UPDATED'
] as const;

let eventTypeMap: Record<string, string> = {
  TIME_OFF_REQUESTED: 'time_off.requested',
  TIME_OFF_REQUEST_UPDATED: 'time_off.updated',
  TIME_OFF_REQUEST_APPROVED: 'time_off.approved',
  TIME_OFF_REQUEST_REJECTED: 'time_off.rejected',
  TIME_OFF_REQUEST_WITHDRAWN: 'time_off.withdrawn',
  BALANCE_UPDATED: 'time_off.balance_updated'
};

export let timeOffEvents = SlateTrigger.create(spec, {
  name: 'Time Off Events',
  key: 'time_off_events',
  description:
    'Triggered when time off requests are submitted, approved, rejected, withdrawn, updated, or when balances change.'
})
  .input(
    z.object({
      eventType: z.string().describe('Clockify webhook event type'),
      timeOff: z.any().describe('Time off data from webhook payload')
    })
  )
  .output(
    z.object({
      requestId: z.string(),
      userId: z.string().optional(),
      policyId: z.string().optional(),
      status: z.string().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
      note: z.string().optional(),
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
      for (let eventType of timeOffEventTypes) {
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
            timeOff: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let timeOff = ctx.input.timeOff;
      let requestId = timeOff.id || timeOff.requestId || 'unknown';
      let mappedType =
        eventTypeMap[ctx.input.eventType] || `time_off.${ctx.input.eventType.toLowerCase()}`;

      return {
        type: mappedType,
        id: `${ctx.input.eventType}_${requestId}_${timeOff.changeDate || Date.now()}`,
        output: {
          requestId,
          userId: timeOff.userId || undefined,
          policyId: timeOff.policyId || undefined,
          status: timeOff.status?.statusType || timeOff.status || undefined,
          start: timeOff.timeOffPeriod?.start || timeOff.start || undefined,
          end: timeOff.timeOffPeriod?.end || timeOff.end || undefined,
          note: timeOff.note || undefined,
          workspaceId: timeOff.workspaceId || undefined
        }
      };
    }
  })
  .build();
