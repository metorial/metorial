import { SlateTool } from 'slates';
import { z } from 'zod';
import { HereClient } from '../lib/client';
import { spec } from '../spec';

export let calculateTransitRoute = SlateTool.create(spec, {
  name: 'Calculate Public Transit Route',
  key: 'calculate_transit_route',
  description:
    'Find public transit journeys between two locations, including walking connections, station information, departure and arrival times, and transfers.',
  instructions: [
    'Use origin and destination in "lat,lng" format.',
    'Provide departureTime or arrivalTime to plan a journey at a particular time.',
    'Use calculate_route for private vehicles; its bus mode calculates a road route rather than a transit itinerary.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      origin: z.string().describe('Journey origin as "lat,lng"'),
      destination: z.string().describe('Journey destination as "lat,lng"'),
      departureTime: z.string().optional().describe('Departure time in RFC 3339 format'),
      arrivalTime: z
        .string()
        .optional()
        .describe('Arrival time in RFC 3339 format; cannot be combined with departureTime'),
      alternatives: z
        .number()
        .int()
        .min(0)
        .max(5)
        .optional()
        .describe('Number of alternative journeys (0 to 5)'),
      changes: z
        .number()
        .int()
        .min(0)
        .max(6)
        .optional()
        .describe('Maximum transfers allowed (0 to 6)'),
      modes: z
        .array(
          z.enum([
            'highSpeedTrain',
            'intercityTrain',
            'interRegionalTrain',
            'regionalTrain',
            'cityTrain',
            'bus',
            'ferry',
            'subway',
            'lightRail',
            'privateBus',
            'inclined',
            'aerial',
            'busRapid',
            'monorail',
            'flight'
          ])
        )
        .min(1)
        .optional()
        .describe('Transit modes to include; all supported modes are allowed when omitted'),
      returnFields: z
        .array(
          z.enum([
            'intermediate',
            'polyline',
            'actions',
            'travelSummary',
            'incidents',
            'bookingLinks',
            'nextDepartures',
            'sourceFeedMapping'
          ])
        )
        .min(1)
        .optional()
        .describe(
          'Additional route details to return; defaults to polyline and travelSummary'
        ),
      pedestrianSpeed: z
        .number()
        .min(0.5)
        .max(2)
        .optional()
        .describe('Walking speed in meters per second'),
      pedestrianMaxDistance: z
        .number()
        .int()
        .min(0)
        .max(6000)
        .optional()
        .describe('Maximum walking distance in meters'),
      wheelchairAccessible: z
        .boolean()
        .optional()
        .describe('Require wheelchair-accessible vehicles and stations'),
      lang: z.string().optional().describe('Preferred response language, such as "en-US"'),
      units: z
        .enum(['metric', 'imperial'])
        .optional()
        .describe('Units for guidance instructions')
    })
  )
  .output(
    z.object({
      routes: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Journeys with provider route IDs, sections, transit lines, stations, times, and requested details'
        ),
      notices: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Provider routing notices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HereClient({ token: ctx.auth.token, authMethod: ctx.auth.authMethod });
    let response = await client.calculateTransitRoute({
      ...ctx.input,
      returnFields: ctx.input.returnFields ?? ['polyline', 'travelSummary']
    });
    let routes = response.routes ?? [];
    return {
      output: { routes, notices: response.notices },
      message: `Found ${routes.length} public transit journey(s).`
    };
  })
  .build();
