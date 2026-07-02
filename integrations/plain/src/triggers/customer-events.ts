import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let customerEventTypes = [
  'customer.customer_created',
  'customer.customer_updated',
  'customer.customer_deleted',
  'customer.customer_group_memberships_changed'
] as const;

export let customerEvents = SlateTrigger.create(spec, {
  name: 'Customer Events',
  key: 'customer_events',
  description:
    'Triggers when customer lifecycle events occur: customer created, updated, deleted, or customer group membership changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('Webhook event type'),
      eventId: z.string().describe('Unique event ID'),
      timestamp: z.string().describe('Event timestamp (ISO 8601)'),
      workspaceId: z.string().describe('Workspace ID'),
      payload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      customerId: z.string().describe('Plain customer ID'),
      fullName: z.string().nullable().describe('Customer full name'),
      email: z.string().nullable().describe('Customer email address'),
      externalId: z.string().nullable().describe('External customer ID'),
      previousFullName: z.string().nullable().describe('Previous full name (for updates)'),
      previousEmail: z.string().nullable().describe('Previous email (for updates)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (!customerEventTypes.includes(data.type)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: data.type,
            eventId: data.id,
            timestamp: data.timestamp,
            workspaceId: data.workspaceId,
            payload: data.payload
          }
        ]
      };
    },
    handleEvent: async ctx => {
      let payload = ctx.input.payload;
      let customer = payload?.customer;
      let previousCustomer = payload?.previousCustomer;

      // For delete events, use previousCustomer
      let current = customer || previousCustomer;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          customerId: current?.id ?? '',
          fullName: current?.fullName ?? null,
          email: current?.email?.email ?? null,
          externalId: current?.externalId ?? null,
          previousFullName: previousCustomer?.fullName ?? null,
          previousEmail: previousCustomer?.email?.email ?? null
        }
      };
    }
  })
  .build();
