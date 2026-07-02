import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newPropertyMatch = SlateTrigger.create(spec, {
  name: 'New Property Match',
  key: 'new_property_match',
  description:
    'Triggered when a new property matching a saved search is found. Delivers the full property document including price, location, photos, and advert details.'
})
  .input(
    z.object({
      propertyId: z.string().describe('Property UUID'),
      title: z.string().describe('Property title'),
      propertyType: z.number().describe('Property type code'),
      transactionType: z.number().describe('Transaction type code'),
      price: z.number().describe('Listed price'),
      surface: z.number().nullable().describe('Surface area in m²'),
      latitude: z.number().nullable().describe('Latitude'),
      longitude: z.number().nullable().describe('Longitude'),
      cityName: z.string().nullable().describe('City name'),
      zipcode: z.string().nullable().describe('ZIP code'),
      bedrooms: z.number().nullable().describe('Number of bedrooms'),
      rooms: z.number().nullable().describe('Number of rooms'),
      pictures: z.array(z.string()).describe('Photo URLs'),
      createdAt: z.string().describe('When the property was first listed'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      propertyId: z.string().describe('UUID of the new matching property'),
      title: z.string().describe('Property title'),
      propertyType: z.string().describe('Type of property'),
      transactionType: z.string().describe('Transaction type (sale or rent)'),
      price: z.number().describe('Listed price in EUR'),
      pricePerMeter: z.number().nullable().describe('Price per m²'),
      surface: z.number().nullable().describe('Surface area in m²'),
      bedrooms: z.number().nullable().describe('Number of bedrooms'),
      rooms: z.number().nullable().describe('Total number of rooms'),
      latitude: z.number().nullable().describe('Latitude'),
      longitude: z.number().nullable().describe('Longitude'),
      cityName: z.string().nullable().describe('City name'),
      zipcode: z.string().nullable().describe('ZIP code'),
      pictures: z.array(z.string()).describe('Property photo URLs'),
      createdAt: z.string().describe('When the property was first listed')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      let search = await client.createSearch({
        title: `Slates Webhook - New Property Match`,
        propertyTypes: [0, 1, 2, 3, 4, 5, 6],
        transactionType: 0,
        notificationEnabled: true,
        endpointRecipient: ctx.input.webhookBaseUrl
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

      let _reversePropertyTypeMap: Record<number, string> = {
        0: 'apartment',
        1: 'house',
        2: 'building',
        3: 'parking',
        4: 'office',
        5: 'land',
        6: 'shop'
      };

      // Match webhook payload contains a `match` object with `propertyDocument`
      let matches = body.match ? [body.match] : Array.isArray(body) ? body : [body];

      let inputs = matches
        .filter((m: any) => m && typeof m === 'object')
        .map((match: any) => {
          let prop = match.propertyDocument ?? match;
          return {
            propertyId: prop.uuid ?? prop['@id']?.split('/').pop() ?? '',
            title: prop.title ?? '',
            propertyType: prop.propertyType ?? 0,
            transactionType: prop.transactionType ?? 0,
            price: prop.price ?? 0,
            surface: prop.surface ?? null,
            latitude: prop.locations?.lat ?? null,
            longitude: prop.locations?.lon ?? null,
            cityName: prop.city?.name ?? null,
            zipcode: prop.city?.zipcode ?? null,
            bedrooms: prop.bedroom ?? null,
            rooms: prop.room ?? null,
            pictures: [...(prop.pictures ?? []), ...(prop.picturesRemote ?? [])],
            createdAt: prop.createdAt ?? match.createdAt ?? new Date().toISOString(),
            rawPayload: match
          };
        });

      return { inputs };
    },

    handleEvent: async ctx => {
      let input = ctx.input;
      let reversePropertyTypeMap: Record<number, string> = {
        0: 'apartment',
        1: 'house',
        2: 'building',
        3: 'parking',
        4: 'office',
        5: 'land',
        6: 'shop'
      };
      let reverseTransactionTypeMap: Record<number, string> = {
        0: 'sale',
        1: 'rent'
      };

      let pricePerMeter =
        input.price && input.surface
          ? Math.round((input.price / input.surface) * 100) / 100
          : null;

      return {
        type: 'property.matched',
        id: `match-${input.propertyId}-${input.createdAt}`,
        output: {
          propertyId: input.propertyId,
          title: input.title,
          propertyType:
            reversePropertyTypeMap[input.propertyType] ?? String(input.propertyType),
          transactionType:
            reverseTransactionTypeMap[input.transactionType] ?? String(input.transactionType),
          price: input.price,
          pricePerMeter,
          surface: input.surface,
          bedrooms: input.bedrooms,
          rooms: input.rooms,
          latitude: input.latitude,
          longitude: input.longitude,
          cityName: input.cityName,
          zipcode: input.zipcode,
          pictures: input.pictures,
          createdAt: input.createdAt
        }
      };
    }
  })
  .build();
