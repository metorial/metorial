import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDispatch = SlateTool.create(spec, {
  name: 'Renewable Energy Dispatch',
  key: 'get_dispatch',
  description: `Provides insights into the flow and composition of renewable energy for a German city. Returns energy mix breakdowns (solar, wind, biomass, etc.), energy flow origins and destinations between locations, and geospatial coordinates for visualization.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      zip: z.string().describe('German postal code (Postleitzahl), 5 digits')
    })
  )
  .output(
    z.object({
      raw: z.unknown().describe('Complete provider response'),
      center: z
        .object({
          city: z.string().optional(),
          zip: z.string().optional(),
          lat: z.number().optional(),
          lng: z.number().optional()
        })
        .optional()
        .describe('Geographic center of the queried location'),
      averageDistanceKm: z
        .number()
        .optional()
        .describe('Average distance in km needed to cover 100% electricity demand'),
      preMix: z
        .record(z.string(), z.number())
        .optional()
        .describe('Electricity mix imported into the location (percentages by source)'),
      postMix: z
        .record(z.string(), z.number())
        .optional()
        .describe(
          'Electricity mix exported to surrounding municipalities (percentages by source)'
        ),
      dispatchFrom: z
        .array(
          z.object({
            city: z.string().optional(),
            zip: z.string().optional(),
            energy: z.number().optional().describe('Percentage of energy from this source'),
            lat: z.number().optional(),
            lng: z.number().optional()
          })
        )
        .optional()
        .describe('Locations supplying electricity to this area'),
      dispatchTo: z
        .array(
          z.object({
            city: z.string().optional(),
            zip: z.string().optional(),
            energy: z.number().optional().describe('Percentage of energy delivered'),
            lat: z.number().optional(),
            lng: z.number().optional()
          })
        )
        .optional()
        .describe('Locations receiving electricity from this area'),
      timeframe: z
        .object({
          start: z.number().optional(),
          end: z.number().optional()
        })
        .optional()
        .describe('Start and end timestamps for the data')
    })
  )
  .handleInvocation(async ctx => {
    let zip = ctx.input.zip || ctx.config.zip;
    if (!zip) {
      throw createApiServiceError('A German postal code (zip) is required.');
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.getDispatch({ zip });

    return {
      output: {
        raw: result,
        center: result.center
          ? {
              city: result.center.city,
              zip: result.center.zip,
              lat: result.center.lat ?? result.center.coordinates?.[1],
              lng: result.center.lng ?? result.center.coordinates?.[0]
            }
          : undefined,
        averageDistanceKm: result.avg_distance_km,
        preMix: result.premix,
        postMix: result.postmix,
        dispatchFrom: result.dispatch_from?.map(loc => ({
          city: loc.city ?? loc.location?.label ?? loc.location?.prettyLabel,
          zip: loc.zip ?? loc.location?.zip,
          energy: loc.energy,
          lat: loc.lat ?? loc.location?.coordinates?.[1],
          lng: loc.lng ?? loc.location?.coordinates?.[0]
        })),
        dispatchTo: result.dispatch_to?.map(loc => ({
          city: loc.city ?? loc.location?.label ?? loc.location?.prettyLabel,
          zip: loc.zip ?? loc.location?.zip,
          energy: loc.energy,
          lat: loc.lat ?? loc.location?.coordinates?.[1],
          lng: loc.lng ?? loc.location?.coordinates?.[0]
        })),
        timeframe: result.timeframe
          ? {
              start: result.timeframe.start,
              end: result.timeframe.end
            }
          : undefined
      },
      message: `Retrieved renewable energy dispatch data for **${result.center?.city || zip}**. Average distance to cover demand: **${result.avg_distance_km ?? 'N/A'} km**.`
    };
  })
  .build();
