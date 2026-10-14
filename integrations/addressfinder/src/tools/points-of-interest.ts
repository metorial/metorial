import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let poiAutocompleteTool = SlateTool.create(spec, {
  name: 'Search Points of Interest',
  key: 'poi_autocomplete',
  description:
    'Find New Zealand points of interest, such as hospitals, schools, and businesses, by partial name or address. Pass a returned poiId to poi_metadata for full details.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().describe('Partial point-of-interest name or address to search for.'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of suggestions, from 1 to 100. Defaults to 10.')
    })
  )
  .output(
    z.object({
      pointsOfInterest: z.array(
        z.object({
          poiId: z.string().describe('Point-of-interest identifier for poi_metadata.'),
          nameAndAddress: z
            .string()
            .describe('Point-of-interest name followed by its address.')
        })
      ),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let data = await client.nzPoiAutocomplete({
      query: ctx.input.query,
      max: ctx.input.maxResults
    });
    let pointsOfInterest = (data.completions ?? []).map(
      (item: { id: string; name_and_address: string }) => ({
        poiId: item.id,
        nameAndAddress: item.name_and_address
      })
    );
    return {
      output: { pointsOfInterest, success: data.success ?? true },
      message: `Found ${pointsOfInterest.length} New Zealand points of interest.`
    };
  })
  .build();

export let poiMetadataTool = SlateTool.create(spec, {
  name: 'Get Point of Interest Metadata',
  key: 'poi_metadata',
  description:
    'Retrieve the name, address, coordinates, and available postal or census details for a New Zealand point of interest. Call poi_autocomplete to find its poiId.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      poiId: z.string().describe('Point-of-interest identifier returned by poi_autocomplete.')
    })
  )
  .output(
    z.object({
      pointOfInterest: z
        .record(z.string(), z.unknown())
        .describe(
          'Full metadata, including the POI pxid and associated address_pxid when available.'
        ),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let data = await client.nzPoiMetadata({ id: ctx.input.poiId });
    return {
      output: { pointOfInterest: data, success: data.success ?? true },
      message: `Retrieved metadata for ${data.name ?? ctx.input.poiId}.`
    };
  })
  .build();
