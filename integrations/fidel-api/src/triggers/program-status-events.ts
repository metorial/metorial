import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let programStatusEvents = SlateTrigger.create(spec, {
  name: 'Program Status Events',
  key: 'program_status_events',
  description: 'Triggers when a program status changes.'
})
  .input(
    z.object({
      eventType: z.literal('program.status').describe('Event type'),
      programId: z.string().describe('Unique identifier of the program'),
      rawEvent: z.any().describe('Raw event payload from Fidel API')
    })
  )
  .output(
    z.object({
      programId: z.string().describe('Unique identifier of the program'),
      name: z.string().optional().describe('Name of the program'),
      accountId: z.string().optional().describe('Account ID'),
      status: z.string().optional().describe('Current status of the program'),
      live: z.boolean().optional().describe('Whether the program is in live mode'),
      activeCard: z.boolean().optional().describe('Whether the program has an active card'),
      created: z.string().optional().describe('ISO 8601 creation timestamp'),
      updated: z.string().optional().describe('ISO 8601 update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations: Array<{ webhookId: string; programId: string; event: string }> = [];

      let programsData = await client.listPrograms({ limit: 100 });
      let programs = programsData?.items ?? [];

      for (let program of programs) {
        try {
          let webhook = await client.createWebhook(program.id, {
            event: 'program.status',
            url: ctx.input.webhookBaseUrl
          });
          registrations.push({
            webhookId: webhook.id,
            programId: program.id,
            event: 'program.status'
          });
        } catch {
          // Continue on error
        }
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations = (ctx.input.registrationDetails as any)?.registrations ?? [];

      for (let reg of registrations) {
        try {
          await client.deleteWebhook(reg.webhookId, reg.programId);
        } catch {
          // Continue on error
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;

      return {
        inputs: [
          {
            eventType: 'program.status' as const,
            programId: data?.id ?? '',
            rawEvent: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let program = ctx.input.rawEvent;

      return {
        type: 'program.status',
        id: ctx.input.programId || `program.status-${Date.now()}`,
        output: {
          programId: program.id ?? ctx.input.programId,
          name: program.name,
          accountId: program.accountId,
          status: program.status,
          live: program.live,
          activeCard: program.activeCard,
          created: program.created,
          updated: program.updated
        }
      };
    }
  })
  .build();
