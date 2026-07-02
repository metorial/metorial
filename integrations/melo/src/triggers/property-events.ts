import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let subscribedEventTypes = [
  'property.ad.create',
  'property.ad.update',
  'ad.update.price',
  'ad.update.surface',
  'ad.update.pictures',
  'ad.update.expired'
] as const;

export let propertyEvents = SlateTrigger.create(spec, {
  name: 'Property Events',
  key: 'property_events',
  description:
    'Triggered when advert-level events occur on properties matching a saved search, such as price changes, new adverts, surface updates, photo changes, or expiration.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of event'),
      propertyId: z.string().describe('Property UUID'),
      advertId: z.string().optional().describe('Advert UUID'),
      searchId: z.string().optional().describe('Saved search ID that triggered this event'),
      fieldName: z.string().optional().describe('Name of the changed field'),
      oldValue: z.unknown().optional().describe('Previous value'),
      newValue: z.unknown().optional().describe('New value'),
      percentVariation: z
        .number()
        .nullable()
        .optional()
        .describe('Percent variation for numeric changes'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      propertyId: z.string().describe('UUID of the affected property'),
      advertId: z.string().nullable().describe('UUID of the affected advert'),
      eventType: z.string().describe('Type of event that occurred'),
      fieldName: z.string().nullable().describe('Changed field name (for update events)'),
      oldValue: z.unknown().nullable().describe('Previous field value'),
      newValue: z.unknown().nullable().describe('New field value'),
      percentVariation: z
        .number()
        .nullable()
        .describe('Percent variation for numeric changes'),
      propertyTitle: z.string().nullable().describe('Property title if available'),
      price: z.number().nullable().describe('Current price if available'),
      surface: z.number().nullable().describe('Current surface if available'),
      cityName: z.string().nullable().describe('City name if available')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      // Create a saved search that sends events to our webhook URL
      // We create a broad search to capture events; users should configure their own search criteria
      let search = await client.createSearch({
        title: `Slates Webhook - Property Events`,
        propertyTypes: [0, 1, 2, 3, 4, 5, 6],
        transactionType: 0,
        notificationEnabled: true,
        eventEndpoint: ctx.input.webhookBaseUrl,
        subscribedEvents: [...subscribedEventTypes]
      });

      let searchId = search.uuid ?? search['@id']?.split('/').pop() ?? '';

      return {
        registrationDetails: { searchId }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      let searchId = (ctx.input.registrationDetails as any)?.searchId;
      if (searchId) {
        await client.deleteSearch(searchId);
      }
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Melo event webhooks can send single events or batches
      let events = Array.isArray(body) ? body : [body];

      let inputs = events
        .filter((e: any) => e && typeof e === 'object')
        .map((event: any) => {
          let eventType = event.event ?? event.type ?? event['@type'] ?? 'unknown';
          let propertyId =
            event.propertyUuid ??
            event.propertyId ??
            event.property?.uuid ??
            (event['@id'] ? event['@id'].split('/').filter(Boolean).pop() : '') ??
            '';
          let advertId = event.advertUuid ?? event.advertId ?? event.advert?.uuid ?? undefined;

          return {
            eventType: String(eventType),
            propertyId: String(propertyId),
            advertId: advertId ? String(advertId) : undefined,
            searchId: event.searchUuid ?? event.searchId ?? undefined,
            fieldName: event.fieldName ?? undefined,
            oldValue: event.fieldOldValue ?? event.oldValue ?? undefined,
            newValue: event.fieldNewValue ?? event.newValue ?? undefined,
            percentVariation: event.percentVariation ?? null,
            rawPayload: event
          };
        });

      return { inputs };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      // Try to extract extra property details from the raw payload
      let raw = input.rawPayload as Record<string, any>;
      let rawProperty = raw?.property ?? raw?.propertyDocument ?? null;
      let propertyTitle = rawProperty?.title ?? raw?.title ?? null;
      let price = rawProperty?.price ?? raw?.price ?? null;
      let surface = rawProperty?.surface ?? raw?.surface ?? null;
      let cityName = rawProperty?.city?.name ?? raw?.city?.name ?? null;

      return {
        type: input.eventType,
        id: `${input.eventType}-${input.propertyId}-${input.advertId ?? 'none'}-${Date.now()}`,
        output: {
          propertyId: input.propertyId,
          advertId: input.advertId ?? null,
          eventType: input.eventType,
          fieldName: input.fieldName ?? null,
          oldValue: input.oldValue ?? null,
          newValue: input.newValue ?? null,
          percentVariation: input.percentVariation ?? null,
          propertyTitle,
          price,
          surface,
          cityName
        }
      };
    }
  })
  .build();
