import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let memberEvents = SlateTrigger.create(spec, {
  name: 'Member Events',
  key: 'member_events',
  description:
    'Triggers when a member is created, updated, or deleted. Configure the webhook URL in the Memberstack dashboard under Dev Tools.'
})
  .input(
    z.object({
      eventType: z
        .enum(['member.created', 'member.updated', 'member.deleted'])
        .describe('Type of member event'),
      timestamp: z.number().describe('Event timestamp in milliseconds'),
      memberId: z.string().describe('ID of the affected member'),
      email: z.string().nullable().optional().describe('Member email address'),
      customFields: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Member custom fields'),
      metaData: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Member metadata'),
      planConnections: z
        .array(
          z.object({
            planConnectionId: z.string().optional(),
            planId: z.string().optional(),
            status: z.string().optional()
          })
        )
        .nullable()
        .optional()
        .describe('Member plan connections at time of event')
    })
  )
  .output(
    z.object({
      memberId: z.string().describe('ID of the affected member'),
      email: z.string().nullable().optional().describe('Member email address'),
      customFields: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Member custom fields'),
      metaData: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Member metadata'),
      planConnections: z
        .array(
          z.object({
            planConnectionId: z.string().optional(),
            planId: z.string().optional(),
            status: z.string().optional()
          })
        )
        .nullable()
        .optional()
        .describe('Member plan connections at time of event'),
      timestamp: z.number().describe('Event timestamp in milliseconds')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let event = data.event as string;
      let payload = data.payload ?? {};

      let validEvents = ['member.created', 'member.updated', 'member.deleted'];
      if (!validEvents.includes(event)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: event as 'member.created' | 'member.updated' | 'member.deleted',
            timestamp: data.timestamp ?? Date.now(),
            memberId: payload.id ?? '',
            email: payload.auth?.email ?? null,
            customFields: payload.customFields ?? null,
            metaData: payload.metaData ?? null,
            planConnections: payload.planConnections ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.memberId}-${ctx.input.timestamp}`,
        output: {
          memberId: ctx.input.memberId,
          email: ctx.input.email,
          customFields: ctx.input.customFields,
          metaData: ctx.input.metaData,
          planConnections: ctx.input.planConnections,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
