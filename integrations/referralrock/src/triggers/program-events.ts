import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

let programEventNames = ['ProgramAdd', 'ProgramUpdate', 'ProgramDelete'] as const;

export let programEvents = SlateTrigger.create(spec, {
  name: 'Program Events',
  key: 'program_events',
  description:
    'Triggered when a referral program is added, updated (activation changes), or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of program event'),
      eventId: z.string().describe('Unique event identifier'),
      program: z.record(z.string(), z.unknown()).describe('Program data from webhook payload')
    })
  )
  .output(
    z.object({
      programId: z.string().describe('Program ID'),
      name: z.string().optional().describe('Program name'),
      title: z.string().optional().describe('Program title'),
      isActive: z.boolean().optional().describe('Whether the program is active'),
      type: z.string().optional().describe('Program type'),
      memberOffer: z.string().optional().describe('Member offer'),
      referralOffer: z.string().optional().describe('Referral offer'),
      directUrl: z.string().optional().describe('Direct URL')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ReferralRockClient({ token: ctx.auth.token });
      let webhookIds: Record<string, string> = {};

      for (let event of programEventNames) {
        let result = await client.registerWebhook(ctx.input.webhookBaseUrl, event);
        webhookIds[event] = result.web_hook_id;
      }

      return { registrationDetails: webhookIds };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ReferralRockClient({ token: ctx.auth.token });
      let webhookIds = ctx.input.registrationDetails as Record<string, string>;

      for (let id of Object.values(webhookIds)) {
        try {
          await client.unregisterWebhook(id);
        } catch {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = (data.event || data.Event || '') as string;
      let program = (data.data || data.Data || data) as Record<string, unknown>;

      let eventId = `${eventType}-${program.id || program.Id || Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            program
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.program;

      let eventTypeMap: Record<string, string> = {
        ProgramAdd: 'program.added',
        ProgramUpdate: 'program.updated',
        ProgramDelete: 'program.deleted'
      };

      return {
        type:
          eventTypeMap[ctx.input.eventType] || `program.${ctx.input.eventType.toLowerCase()}`,
        id: ctx.input.eventId,
        output: {
          programId: (p.id || p.Id || '') as string,
          name: (p.name || p.Name) as string | undefined,
          title: (p.title || p.Title) as string | undefined,
          isActive: (p.isActive || p.IsActive) as boolean | undefined,
          type: (p.type || p.Type) as string | undefined,
          memberOffer: (p.memberOffer || p.MemberOffer) as string | undefined,
          referralOffer: (p.referralOffer || p.ReferralOffer) as string | undefined,
          directUrl: (p.directUrl || p.DirectUrl) as string | undefined
        }
      };
    }
  })
  .build();
