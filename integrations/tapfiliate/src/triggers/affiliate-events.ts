import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let affiliateEvents = SlateTrigger.create(spec, {
  name: 'Affiliate Events',
  key: 'affiliate_events',
  description:
    'Triggered when an affiliate is created, added to a program, or approved for a program. Configure the webhook URL in the Tapfiliate dashboard under Settings > Trigger emails & webhooks.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of the affiliate event'),
      affiliateId: z.string().describe('ID of the affiliate'),
      affiliate: z.any().describe('Full affiliate data from the webhook payload'),
      program: z.any().optional().describe('Program data if the event is program-related')
    })
  )
  .output(
    z.object({
      affiliateId: z.string().describe('Unique identifier of the affiliate'),
      firstname: z.string().optional().describe('First name of the affiliate'),
      lastname: z.string().optional().describe('Last name of the affiliate'),
      email: z.string().optional().describe('Email address of the affiliate'),
      programId: z.string().optional().describe('Program ID if the event is program-related'),
      programTitle: z
        .string()
        .optional()
        .describe('Program title if the event is program-related')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = 'affiliate.created';
      if (data.event === 'affiliate-added-to-program' || data.program) {
        eventType = data.approved
          ? 'affiliate.approved_for_program'
          : 'affiliate.added_to_program';
      }
      if (data.event === 'affiliate-approved-for-program') {
        eventType = 'affiliate.approved_for_program';
      }
      if (data.event === 'affiliate-created') {
        eventType = 'affiliate.created';
      }

      let affiliate = data.affiliate || data;

      return {
        inputs: [
          {
            eventType,
            affiliateId: affiliate.id || data.id,
            affiliate,
            program: data.program
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let affiliate = ctx.input.affiliate || {};

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.affiliateId}-${Date.now()}`,
        output: {
          affiliateId: ctx.input.affiliateId,
          firstname: affiliate.firstname,
          lastname: affiliate.lastname,
          email: affiliate.email,
          programId: ctx.input.program?.id,
          programTitle: ctx.input.program?.title
        }
      };
    }
  })
  .build();
