import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let planEvents = SlateTrigger.create(spec, {
  name: 'Plan Events',
  key: 'plan_events',
  description: 'Triggered when a recurring plan is created, updated, canceled, or resumed.'
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'updated', 'canceled', 'resumed'])
        .describe('Type of plan event'),
      planId: z.string().describe('Plan ID'),
      rawPayload: z.any().describe('Raw plan payload')
    })
  )
  .output(
    z.object({
      planId: z.string().describe('Plan ID'),
      firstName: z.string().nullable().describe('Donor first name'),
      lastName: z.string().nullable().describe('Donor last name'),
      email: z.string().nullable().describe('Donor email'),
      phone: z.string().nullable().describe('Donor phone'),
      frequency: z.string().nullable().describe('Plan frequency'),
      status: z.string().nullable().describe('Plan status'),
      method: z.string().nullable().describe('Payment method'),
      amount: z.number().nullable().describe('Recurring amount'),
      feeCovered: z.number().nullable().describe('Fee covered by donor'),
      startAt: z.string().nullable().describe('Plan start date'),
      nextBillDate: z.string().nullable().describe('Next billing date'),
      createdAt: z.string().nullable().describe('When created')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventStr = body.event as string;
      if (!eventStr?.startsWith('plan.')) {
        return { inputs: [] };
      }

      let eventType = eventStr.replace('plan.', '') as
        | 'created'
        | 'updated'
        | 'canceled'
        | 'resumed';
      if (!['created', 'updated', 'canceled', 'resumed'].includes(eventType)) {
        return { inputs: [] };
      }

      let data = body.data;

      return {
        inputs: [
          {
            eventType,
            planId: String(data.id),
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let d = ctx.input.rawPayload;

      // Plan webhook payloads may not include full data; if critical fields are missing, fetch from API
      let planData = d;
      if (!d.first_name && !d.email && ctx.input.eventType !== 'canceled') {
        try {
          let client = new Client({ token: ctx.auth.token });
          planData = await client.getPlan(ctx.input.planId);
        } catch {
          planData = d;
        }
      }

      return {
        type: `plan.${ctx.input.eventType}`,
        id: `plan-${ctx.input.planId}-${ctx.input.eventType}-${d.updated_at ?? d.created_at ?? Date.now()}`,
        output: {
          planId: ctx.input.planId,
          firstName: planData.first_name ?? null,
          lastName: planData.last_name ?? null,
          email: planData.email ?? null,
          phone: planData.phone ?? null,
          frequency: planData.frequency ?? null,
          status: planData.status ?? null,
          method: planData.method ?? null,
          amount: planData.amount ?? null,
          feeCovered: planData.fee_covered ?? null,
          startAt: planData.start_at ?? null,
          nextBillDate: planData.next_bill_date ?? null,
          createdAt: planData.created_at ?? null
        }
      };
    }
  })
  .build();
