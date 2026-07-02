import { SlateTool } from 'slates';
import { z } from 'zod';
import { DiscoveryClient } from '../lib/client';
import { mapAttraction } from '../lib/mappers';
import { spec } from '../spec';

export let getAttractionDetailsTool = SlateTool.create(spec, {
  name: 'Get Attraction Details',
  key: 'get_attraction_details',
  description: `Retrieve full details for a specific attraction (artist, team, performer) by its Ticketmaster attraction ID. Returns images, classifications, external links, upcoming event counts, and aliases.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      attractionId: z.string().describe('Ticketmaster attraction ID')
    })
  )
  .output(
    z.object({
      attractionId: z.string(),
      name: z.string(),
      type: z.string(),
      url: z.string(),
      locale: z.string(),
      upcomingEvents: z.record(z.string(), z.any()),
      externalLinks: z.record(z.string(), z.any()),
      images: z.array(
        z.object({
          url: z.string(),
          width: z.number().nullable(),
          height: z.number().nullable(),
          ratio: z.string()
        })
      ),
      classifications: z.array(
        z.object({
          primary: z.boolean(),
          segmentName: z.string(),
          segmentId: z.string(),
          genreName: z.string(),
          genreId: z.string(),
          subGenreName: z.string(),
          subGenreId: z.string()
        })
      ),
      aliases: z.array(z.string())
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiscoveryClient({
      token: ctx.auth.token,
      countryCode: ctx.config.countryCode,
      locale: ctx.config.locale
    });

    let response = await client.getAttractionDetails(ctx.input.attractionId);
    let attraction = mapAttraction(response);

    if (!attraction) {
      throw new Error(`Attraction not found: ${ctx.input.attractionId}`);
    }

    return {
      output: attraction,
      message: `**${attraction.name}** - ${attraction.classifications
        .map((c: any) => c.segmentName)
        .filter(Boolean)
        .join(', ')}`
    };
  })
  .build();
