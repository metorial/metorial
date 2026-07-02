import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { spec } from '../spec';

export let timeoffEventsTrigger = SlateTrigger.create(spec, {
  name: 'Time Off Events',
  key: 'timeoff_events',
  description: 'Triggered when a time-off request is updated for an employee.'
})
  .input(
    z.object({
      eventType: z.literal('timeoff_updated').describe('Type of time-off event'),
      timeoff: z.any().describe('Time-off request payload from the webhook')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Time-off request ID'),
      employeeId: z.string().optional().describe('Employee ID'),
      employeeName: z.string().optional().describe('Employee name'),
      categoryName: z.string().optional().describe('Time-off category name'),
      startDate: z.string().optional().describe('Start date'),
      endDate: z.string().optional().describe('End date'),
      status: z.string().optional().describe('Request status'),
      notes: z.string().optional().describe('Request notes')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new WorkableClient({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain
      });

      let result = await client.createSubscription({
        target: ctx.input.webhookBaseUrl,
        event: 'timeoff_updated'
      });

      return {
        registrationDetails: { subscriptionId: result.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WorkableClient({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain
      });

      let subId = ctx.input.registrationDetails?.subscriptionId;
      if (subId) {
        try {
          await client.deleteSubscription(subId);
        } catch {
          // Best effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event || data.type || 'timeoff_updated';
      let timeoff = data.data || data.timeoff || data;

      return {
        inputs: [
          {
            eventType: eventType as 'timeoff_updated',
            timeoff
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let t = ctx.input.timeoff;

      return {
        type: 'timeoff.updated',
        id: `${t.id || t.request_id}-timeoff_updated-${Date.now()}`,
        output: {
          requestId: t.id || t.request_id,
          employeeId: t.employee_id || t.employee?.id,
          employeeName: t.employee_name || t.employee?.name,
          categoryName: t.category_name || t.category?.name,
          startDate: t.start_date,
          endDate: t.end_date,
          status: t.status,
          notes: t.notes
        }
      };
    }
  })
  .build();
