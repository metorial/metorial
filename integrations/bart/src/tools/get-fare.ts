import { SlateTool } from 'slates';
import { z } from 'zod';
import { BartClient } from '../lib/client';
import { spec } from '../spec';

let fareTypeSchema = z.object({
  amount: z.string().describe('Fare amount in USD'),
  fareClass: z
    .string()
    .describe('Fare class identifier (e.g., "clipper", "cash", "senior", "youth")'),
  fareName: z.string().describe('Display name for the fare type')
});

export let getFare = SlateTool.create(spec, {
  name: 'Get Fare',
  key: 'get_fare',
  description: `Retrieve fare costs between any two BART stations. Returns fare breakdown by type including Clipper, cash, senior/disabled, and youth pricing. If origin and destination are the same station, the excursion fare is returned.`,
  instructions: [
    'Use station abbreviation codes (e.g., "12TH" for 12th St Oakland, "EMBR" for Embarcadero).',
    'Date format: "mm/dd/yyyy", "today", or "now".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      origin: z.string().describe('Origin station abbreviation code'),
      destination: z.string().describe('Destination station abbreviation code'),
      date: z
        .string()
        .optional()
        .describe('Fare date in "mm/dd/yyyy" format, "today", or "now"')
    })
  )
  .output(
    z.object({
      origin: z.string().describe('Origin station abbreviation'),
      destination: z.string().describe('Destination station abbreviation'),
      scheduleNumber: z.string().describe('Schedule number used for fare calculation'),
      fares: z.array(fareTypeSchema).describe('Fare options by type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BartClient({ token: ctx.auth.token });

    let result = await client.getFare({
      origin: ctx.input.origin,
      destination: ctx.input.destination,
      date: ctx.input.date
    });

    let fareData = result?.fares?.fare;
    let fares = Array.isArray(fareData) ? fareData : fareData ? [fareData] : [];

    let mappedFares = fares.map((f: any) => ({
      amount: f['@amount'] || '',
      fareClass: f['@class'] || '',
      fareName: f['@name'] || ''
    }));

    let clipperFare = mappedFares.find((f: any) => f.fareClass === 'clipper');

    return {
      output: {
        origin: result?.origin || '',
        destination: result?.destination || '',
        scheduleNumber: result?.sched_num || '',
        fares: mappedFares
      },
      message: `Fare from **${ctx.input.origin}** to **${ctx.input.destination}**: ${clipperFare ? `$${clipperFare.amount} (Clipper)` : `${mappedFares.length} fare type(s) returned`}.`
    };
  })
  .build();
