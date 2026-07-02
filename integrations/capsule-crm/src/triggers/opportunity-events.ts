import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let opportunityEvents = SlateTrigger.create(spec, {
  name: 'Opportunity Events',
  key: 'opportunity_events',
  description:
    'Triggered when a sales opportunity is created, updated, deleted, closed, or moved to a different milestone in Capsule CRM.'
})
  .input(
    z.object({
      eventType: z
        .enum([
          'opportunity/created',
          'opportunity/updated',
          'opportunity/deleted',
          'opportunity/closed',
          'opportunity/moved'
        ])
        .describe('Type of opportunity event'),
      opportunities: z.array(z.any()).describe('Opportunity records from the webhook payload')
    })
  )
  .output(
    z.object({
      opportunityId: z.number().describe('ID of the affected opportunity'),
      name: z.string().optional().describe('Opportunity name'),
      description: z.string().optional().describe('Description'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Update timestamp'),
      closedOn: z.string().optional().describe('Close date'),
      expectedCloseOn: z.string().optional().describe('Expected close date'),
      probability: z.number().optional().describe('Win probability'),
      value: z.any().optional().describe('Deal value'),
      milestone: z.any().optional().describe('Current milestone'),
      party: z.any().optional().describe('Associated party'),
      owner: z.any().optional().describe('Assigned owner'),
      lostReason: z.string().optional().describe('Lost reason')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new CapsuleClient({ token: ctx.auth.token });

      let events = [
        'opportunity/created',
        'opportunity/updated',
        'opportunity/deleted',
        'opportunity/closed',
        'opportunity/moved'
      ];
      let hooks: Array<{ hookId: number; event: string }> = [];

      for (let event of events) {
        let hook = await client.createRestHook({
          event,
          targetUrl: ctx.input.webhookBaseUrl,
          description: `Slates: ${event}`
        });
        hooks.push({ hookId: hook.id, event });
      }

      return {
        registrationDetails: { hooks }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new CapsuleClient({ token: ctx.auth.token });
      let hooks = (ctx.input.registrationDetails as any)?.hooks || [];

      for (let hook of hooks) {
        try {
          await client.deleteRestHook(hook.hookId);
        } catch {
          // Hook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event,
            opportunities: data.payload || []
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let opportunities = ctx.input.opportunities || [];
      let eventAction = ctx.input.eventType.split('/')[1] || 'unknown';

      if (opportunities.length === 0) {
        return {
          type: `opportunity.${eventAction}`,
          id: `${ctx.input.eventType}-${Date.now()}`,
          output: {
            opportunityId: 0
          }
        };
      }

      let o = opportunities[0];

      return {
        type: `opportunity.${eventAction}`,
        id: `${ctx.input.eventType}-${o.id}-${o.updatedAt || o.createdAt || Date.now()}`,
        output: {
          opportunityId: o.id,
          name: o.name,
          description: o.description,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
          closedOn: o.closedOn,
          expectedCloseOn: o.expectedCloseOn,
          probability: o.probability,
          value: o.value,
          milestone: o.milestone,
          party: o.party,
          owner: o.owner,
          lostReason: o.lostReason
        }
      };
    }
  })
  .build();
