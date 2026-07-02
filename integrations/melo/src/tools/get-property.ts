import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { mapPropertyOutput, propertyOutputSchema } from './search-properties';

export let getProperty = SlateTool.create(spec, {
  name: 'Get Property',
  key: 'get_property',
  description: `Retrieve detailed information for a specific property by its ID. Returns the full property document including all adverts, location data, photos, energy ratings, contact info, and nearby transit stations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      propertyId: z.string().describe('UUID of the property to retrieve')
    })
  )
  .output(propertyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let property = await client.getProperty(ctx.input.propertyId);
    let output = mapPropertyOutput(property);

    return {
      output,
      message: `Retrieved property **${output.title}** in ${output.cityName ?? 'unknown location'} — ${output.price.toLocaleString()}€, ${output.surface ?? '?'}m².`
    };
  })
  .build();
