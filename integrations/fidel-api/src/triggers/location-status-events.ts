import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let locationStatusEvents = SlateTrigger.create(spec, {
  name: 'Location Status Events',
  key: 'location_status_events',
  description:
    'Triggers when a location onboarding status changes with the card networks (Visa, Mastercard, American Express).'
})
  .input(
    z.object({
      eventType: z.literal('location.status').describe('Event type'),
      locationId: z.string().describe('Unique identifier of the location'),
      rawEvent: z.any().describe('Raw event payload from Fidel API')
    })
  )
  .output(
    z.object({
      locationId: z.string().describe('Unique identifier of the location'),
      programId: z.string().optional().describe('ID of the program'),
      brandId: z.string().optional().describe('ID of the brand'),
      accountId: z.string().optional().describe('Account ID'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      countryCode: z.string().optional().describe('Country code'),
      postcode: z.string().optional().describe('Postal code'),
      status: z.string().optional().describe('Current onboarding status'),
      live: z.boolean().optional().describe('Whether the location is in live mode'),
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
            event: 'location.status',
            url: ctx.input.webhookBaseUrl
          });
          registrations.push({
            webhookId: webhook.id,
            programId: program.id,
            event: 'location.status'
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
            eventType: 'location.status' as const,
            locationId: data?.id ?? '',
            rawEvent: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let location = ctx.input.rawEvent;

      return {
        type: 'location.status',
        id: ctx.input.locationId || `location.status-${Date.now()}`,
        output: {
          locationId: location.id ?? ctx.input.locationId,
          programId: location.programId,
          brandId: location.brandId,
          accountId: location.accountId,
          address: location.address,
          city: location.city,
          countryCode: location.countryCode,
          postcode: location.postcode,
          status: location.status,
          live: location.live,
          created: location.created,
          updated: location.updated
        }
      };
    }
  })
  .build();
