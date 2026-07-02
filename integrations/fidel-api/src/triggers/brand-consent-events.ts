import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let brandConsentEvents = SlateTrigger.create(spec, {
  name: 'Brand Consent Events',
  key: 'brand_consent_events',
  description:
    'Triggers when a brand consent status changes, indicating whether a brand has given or revoked consent for transaction tracking.'
})
  .input(
    z.object({
      eventType: z.literal('brand.consent').describe('Event type'),
      brandId: z.string().describe('Unique identifier of the brand'),
      rawEvent: z.any().describe('Raw event payload from Fidel API')
    })
  )
  .output(
    z.object({
      brandId: z.string().describe('Unique identifier of the brand'),
      name: z.string().optional().describe('Name of the brand'),
      accountId: z.string().optional().describe('Account ID'),
      consent: z.boolean().optional().describe('Whether the brand has given consent'),
      live: z.boolean().optional().describe('Whether the brand is in live mode'),
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
            event: 'brand.consent',
            url: ctx.input.webhookBaseUrl
          });
          registrations.push({
            webhookId: webhook.id,
            programId: program.id,
            event: 'brand.consent'
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
            eventType: 'brand.consent' as const,
            brandId: data?.id ?? '',
            rawEvent: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let brand = ctx.input.rawEvent;

      return {
        type: 'brand.consent',
        id: ctx.input.brandId || `brand.consent-${Date.now()}`,
        output: {
          brandId: brand.id ?? ctx.input.brandId,
          name: brand.name,
          accountId: brand.accountId,
          consent: brand.consent,
          live: brand.live,
          created: brand.created,
          updated: brand.updated
        }
      };
    }
  })
  .build();
