import { SlateTool } from 'slates';
import { z } from 'zod';
import { HereClient } from '../lib/client';
import { spec } from '../spec';

export let lookupPlace = SlateTool.create(spec, {
  name: 'Lookup Place',
  key: 'lookup_place',
  description: `Retrieve detailed information about a specific place using its HERE place ID. Returns comprehensive data including address, coordinates, categories, contacts, opening hours, and ratings.
HERE place IDs are returned by other search tools (geocode, search places, autosuggest).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      placeId: z
        .string()
        .describe(
          'HERE place/address ID (e.g. "here:pds:place:276u0vhj-b0bace6448ae4b0fbc1d5e323998a7d2")'
        ),
      lang: z.string().optional().describe('BCP 47 language code (e.g. "en-US")')
    })
  )
  .output(
    z.object({
      title: z.string().optional().describe('Place name or title'),
      hereId: z.string().optional().describe('HERE place ID'),
      resultType: z.string().optional().describe('Result type'),
      address: z
        .object({
          label: z.string().optional(),
          countryCode: z.string().optional(),
          countryName: z.string().optional(),
          state: z.string().optional(),
          city: z.string().optional(),
          district: z.string().optional(),
          street: z.string().optional(),
          postalCode: z.string().optional(),
          houseNumber: z.string().optional()
        })
        .optional()
        .describe('Full address'),
      position: z
        .object({
          lat: z.number(),
          lng: z.number()
        })
        .optional()
        .describe('Geographic coordinates'),
      categories: z
        .array(
          z.object({
            categoryId: z.string().optional(),
            name: z.string().optional()
          })
        )
        .optional()
        .describe('Place categories'),
      contacts: z
        .array(
          z.object({
            phone: z.array(z.object({ value: z.string().optional() })).optional(),
            www: z.array(z.object({ value: z.string().optional() })).optional(),
            email: z.array(z.object({ value: z.string().optional() })).optional()
          })
        )
        .optional()
        .describe('Contact information'),
      openingHours: z
        .array(
          z.object({
            text: z.array(z.string()).optional(),
            isOpen: z.boolean().optional()
          })
        )
        .optional()
        .describe('Opening hours'),
      references: z
        .array(
          z.object({
            supplier: z.object({ sourceId: z.string().optional() }).optional(),
            externalId: z.string().optional()
          })
        )
        .optional()
        .describe('External references')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HereClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let place = await client.lookup({
      placeId: ctx.input.placeId,
      lang: ctx.input.lang
    });

    let result = {
      title: place.title,
      hereId: place.id,
      resultType: place.resultType,
      address: place.address,
      position: place.position,
      categories: place.categories?.map((c: any) => ({ categoryId: c.id, name: c.name })),
      contacts: place.contacts,
      openingHours: place.openingHours,
      references: place.references
    };

    return {
      output: result,
      message: `Retrieved details for **${result.title || ctx.input.placeId}**${result.address?.label ? ` at ${result.address.label}` : ''}.`
    };
  })
  .build();
