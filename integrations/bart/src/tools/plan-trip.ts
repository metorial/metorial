import { SlateTool } from 'slates';
import { z } from 'zod';
import { BartClient } from '../lib/client';
import { bartRecord, bartRecords, bartText } from '../lib/response';
import { spec } from '../spec';

let fareSchema = z.object({
  amount: z.string().describe('Fare amount in USD'),
  fareClass: z
    .string()
    .describe('Fare class identifier (e.g., "clipper", "cash", "senior", "youth")'),
  fareName: z.string().describe('Display name for the fare type')
});

let legSchema = z.object({
  order: z.string().describe('Leg order number'),
  origin: z.string().describe('Origin station abbreviation'),
  destination: z.string().describe('Destination station abbreviation'),
  originTime: z.string().describe('Departure time from origin'),
  originDate: z.string().describe('Departure date from origin'),
  destinationTime: z.string().describe('Arrival time at destination'),
  destinationDate: z.string().describe('Arrival date at destination'),
  line: z.string().describe('Route line identifier'),
  trainHeadStation: z.string().describe('Train head station (final destination of the train)'),
  bikeflag: z.string().describe('"1" if bikes are allowed on this leg'),
  originPlatform: z.string().optional().describe('Departure platform for this leg'),
  destinationPlatform: z.string().optional().describe('Arrival platform for this leg'),
  transferCode: z
    .string()
    .describe(
      'Transfer type: "" (none), "N" (normal), "T" (timed ~5min), "S" (scheduled, no wait)'
    )
});

let tripSchema = z.object({
  origin: z.string().describe('Trip origin station abbreviation'),
  destination: z.string().describe('Trip destination station abbreviation'),
  fare: z.string().describe('Cash fare in USD'),
  clipperFare: z.string().describe('Clipper card fare in USD'),
  originTime: z.string().describe('Departure time'),
  originDate: z.string().describe('Departure date'),
  destinationTime: z.string().describe('Arrival time'),
  destinationDate: z.string().describe('Arrival date'),
  tripTime: z.string().describe('Total trip time in minutes'),
  fares: z.array(fareSchema).describe('Breakdown of fares by type'),
  legs: z.array(legSchema).describe('Individual legs of the trip')
});

export let planTrip = SlateTool.create(spec, {
  name: 'Plan Trip',
  key: 'plan_trip',
  description: `Plan a trip between two BART stations. Returns trip options with departure/arrival times, fare information (cash and Clipper pricing), trip duration, and detailed leg-by-leg routing including transfer information. You can plan by desired departure or arrival time.`,
  instructions: [
    'Use station abbreviation codes (e.g., "RICH" for Richmond, "EMBR" for Embarcadero).',
    'Time format: "h:mm am/pm" (e.g., "6:00 pm") or "now" for current time.',
    'Date format: "mm/dd/yyyy", "today", or "now". Date range: up to 10 days past and 8 weeks in the future.',
    'The sum of tripsBefore and tripsAfter must be <= 6.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      origin: z.string().describe('Origin station abbreviation code (e.g., "RICH", "EMBR")'),
      destination: z
        .string()
        .describe('Destination station abbreviation code (e.g., "CIVC", "DALY")'),
      tripType: z
        .enum(['depart', 'arrive'])
        .default('depart')
        .describe('"depart" to plan by departure time, "arrive" to plan by arrival time'),
      time: z.string().optional().describe('Desired time in "h:mm am/pm" format or "now"'),
      date: z
        .string()
        .optional()
        .describe('Trip date in "mm/dd/yyyy" format, "today", or "now"'),
      tripsBefore: z
        .number()
        .optional()
        .describe('Number of trip options before the specified time (0-3, default: 2)'),
      tripsAfter: z
        .number()
        .optional()
        .describe('Number of trip options after the specified time (1-3, default: 2)')
    })
  )
  .output(
    z.object({
      origin: z.string().describe('Origin station abbreviation'),
      destination: z.string().describe('Destination station abbreviation'),
      scheduleDate: z.string().describe('Schedule date'),
      scheduleTime: z.string().describe('Schedule time'),
      trips: z.array(tripSchema).describe('Available trip options')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BartClient({ token: ctx.auth.token });
    let result = await client.planTrip({ ...ctx.input, type: ctx.input.tripType });
    let schedule = bartRecord(result.schedule);
    let trips = bartRecords(bartRecord(schedule.request).trip).map(trip => {
      let fares = bartRecords(bartRecord(trip.fares).fare).map(f => ({
        amount: bartText(f['@amount']),
        fareClass: bartText(f['@class']),
        fareName: bartText(f['@name'])
      }));
      return {
        origin: bartText(trip['@origin']),
        destination: bartText(trip['@destination']),
        fare: fares.find(f => f.fareClass === 'cash')?.amount || bartText(trip['@fare']),
        clipperFare:
          fares.find(f => f.fareClass === 'clipper')?.amount || bartText(trip['@clipper']),
        originTime: bartText(trip['@origTimeMin']),
        originDate: bartText(trip['@origTimeDate']),
        destinationTime: bartText(trip['@destTimeMin']),
        destinationDate: bartText(trip['@destTimeDate']),
        tripTime: bartText(trip['@tripTime']),
        fares,
        legs: bartRecords(trip.leg).map(leg => ({
          order: bartText(leg['@order']),
          origin: bartText(leg['@origin']),
          destination: bartText(leg['@destination']),
          originTime: bartText(leg['@origTimeMin']),
          originDate: bartText(leg['@origTimeDate']),
          destinationTime: bartText(leg['@destTimeMin']),
          destinationDate: bartText(leg['@destTimeDate']),
          line: bartText(leg['@line']),
          trainHeadStation: bartText(leg['@trainHeadStation']),
          bikeflag: bartText(leg['@bikeflag']) || '0',
          transferCode: bartText(leg['@transfercode']),
          originPlatform: bartText(leg['@originPlatform']),
          destinationPlatform: bartText(leg['@destinationPlatform'])
        }))
      };
    });
    return {
      output: {
        origin: bartText(result.origin),
        destination: bartText(result.destination),
        scheduleDate: bartText(schedule.date),
        scheduleTime: bartText(schedule.time),
        trips
      },
      message: `Found **${trips.length}** trip option(s) from **${ctx.input.origin}** to **${ctx.input.destination}**.`
    };
  })
  .build();
