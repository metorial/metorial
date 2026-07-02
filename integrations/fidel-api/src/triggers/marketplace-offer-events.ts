import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let marketplaceEventTypes = ['marketplace.offer.live', 'marketplace.offer.updated'] as const;

export let marketplaceOfferEvents = SlateTrigger.create(spec, {
  name: 'Marketplace Offer Events',
  key: 'marketplace_offer_events',
  description: 'Triggers when a marketplace offer goes live or is updated.'
})
  .input(
    z.object({
      eventType: z.enum(marketplaceEventTypes).describe('Type of marketplace offer event'),
      offerId: z.string().describe('Unique identifier of the offer'),
      rawEvent: z.any().describe('Raw event payload from Fidel API')
    })
  )
  .output(
    z.object({
      offerId: z.string().describe('Unique identifier of the offer'),
      programId: z.string().optional().describe('ID of the program'),
      brandId: z.string().optional().describe('ID of the brand'),
      accountId: z.string().optional().describe('Account ID'),
      name: z.string().optional().describe('Name of the offer'),
      countryCode: z.string().optional().describe('Country code'),
      status: z.string().optional().describe('Current status of the offer'),
      offerType: z.string().optional().describe('Offer type (amount or discount)'),
      offerValue: z.number().optional().describe('Offer value'),
      startDate: z.string().optional().describe('ISO 8601 start date'),
      endDate: z.string().optional().describe('ISO 8601 end date'),
      live: z.boolean().optional().describe('Whether the offer is in live mode'),
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
        for (let event of marketplaceEventTypes) {
          try {
            let webhook = await client.createWebhook(program.id, {
              event,
              url: ctx.input.webhookBaseUrl
            });
            registrations.push({
              webhookId: webhook.id,
              programId: program.id,
              event
            });
          } catch {
            // Continue on error
          }
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
      let eventType = data?.type ?? 'marketplace.offer.live';
      let offerId = data?.id ?? '';

      return {
        inputs: [
          {
            eventType: eventType as (typeof marketplaceEventTypes)[number],
            offerId,
            rawEvent: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let offer = ctx.input.rawEvent;

      return {
        type: ctx.input.eventType,
        id: ctx.input.offerId || `${ctx.input.eventType}-${Date.now()}`,
        output: {
          offerId: offer.id ?? ctx.input.offerId,
          programId: offer.programId,
          brandId: offer.brandId,
          accountId: offer.accountId,
          name: offer.name,
          countryCode: offer.countryCode,
          status: offer.status,
          offerType: offer.type?.name ?? offer.type,
          offerValue: offer.type?.value ?? offer.value,
          startDate: offer.startDate,
          endDate: offer.endDate,
          live: offer.live,
          created: offer.created,
          updated: offer.updated
        }
      };
    }
  })
  .build();
