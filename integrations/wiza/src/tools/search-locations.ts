import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchLocations = SlateTool.create(spec, {
  key: 'search_locations',
  name: 'Search Locations',
  description:
    'Find location names and buckets accepted by Search Prospects. Use the returned key as the location filter value and bucket as its b field.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      query: z
        .string()
        .trim()
        .min(3)
        .describe('Location prefix of at least 3 characters, such as tor.')
    })
  )
  .output(
    z.object({
      locations: z.array(
        z.object({
          key: z.string().describe('Accepted location value.'),
          bucket: z.string().describe('Location bucket, such as city or state.'),
          count: z.number().describe('Number of matching profiles.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).searchLocations(ctx.input.query);
    return {
      output: { locations: result.data },
      message: `Found ${result.data.length} matching locations.`
    };
  })
  .build();
