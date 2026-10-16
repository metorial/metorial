import { SlateTool } from 'slates';
import { z } from 'zod';
import { BartClient } from '../lib/client';
import { bartRecords, bartText } from '../lib/response';
import { spec } from '../spec';

let estimateSchema = z.object({
  minutes: z.string().describe('Minutes until departure, or "Leaving" if departing now'),
  platform: z.string().describe('Platform number'),
  direction: z.string().describe('"North" or "South"'),
  length: z.string().describe('Number of train cars'),
  color: z.string().describe('Line color name (e.g., RED, BLUE, ORANGE)'),
  hexcolor: z.string().describe('Line color hex code'),
  bikeflag: z.string().describe('"1" if bikes are allowed'),
  delay: z.string().describe('Delay in seconds from scheduled time'),
  cancelflag: z.string().describe('"1" if this train is cancelled'),
  dynamicflag: z.string().describe('"1" if this is an unscheduled addition')
});

let destinationEstimateSchema = z.object({
  destination: z.string().describe('Destination station name'),
  abbreviation: z.string().describe('Destination station abbreviation'),
  limited: z.string().describe('Limited service flag'),
  estimates: z
    .array(estimateSchema)
    .describe('List of departure estimates for this destination')
});

let stationDepartureSchema = z.object({
  stationName: z.string().describe('Station name'),
  stationAbbr: z.string().describe('Station abbreviation code'),
  departures: z.array(destinationEstimateSchema).describe('Departures grouped by destination')
});

export let getRealTimeDepartures = SlateTool.create(spec, {
  name: 'Get Real-Time Departures',
  key: 'get_real_time_departures',
  description: `Retrieve real-time estimated departure times for trains at a BART station. Returns upcoming departures grouped by destination, including train length, line color, delay info, bike availability, and cancellation status. Since dwell times are under one minute, ETDs effectively represent arrival times as well.`,
  instructions: [
    'Use station abbreviation codes (e.g., "RICH" for Richmond, "EMBR" for Embarcadero). Use "ALL" to get departures for all stations.',
    'Use either a platform filter or a direction filter, not both.',
    'Platform and direction filters cannot be used with station set to "ALL".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      station: z
        .string()
        .describe(
          'Station abbreviation code (e.g., "RICH", "EMBR") or "ALL" for all stations'
        ),
      platform: z
        .number()
        .optional()
        .describe('Filter by platform number (1-4, station dependent)'),
      groupByColor: z
        .boolean()
        .optional()
        .describe('Group results by line color instead of destination'),
      direction: z
        .enum(['n', 's'])
        .optional()
        .describe('Filter by direction: "n" for North, "s" for South')
    })
  )
  .output(
    z.object({
      date: z.string().describe('Current date'),
      time: z.string().describe('Current time'),
      stations: z.array(stationDepartureSchema).describe('Departure estimates by station')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BartClient({ token: ctx.auth.token });
    let result = await client.getEstimatedDepartures(ctx.input);
    let stations = bartRecords(result.station).map(s => ({
      stationName: bartText(s.name),
      stationAbbr: bartText(s.abbr),
      departures: bartRecords(s.etd).map(etd => ({
        destination: bartText(etd.destination),
        abbreviation: bartText(etd.abbreviation),
        limited: bartText(etd.limited) || '0',
        estimates: bartRecords(etd.estimate).map(est => ({
          minutes: bartText(est.minutes),
          platform: bartText(est.platform),
          direction: bartText(est.direction),
          length: bartText(est.length),
          color: bartText(est.color),
          hexcolor: bartText(est.hexcolor),
          bikeflag: bartText(est.bikeflag),
          delay: bartText(est.delay),
          cancelflag: bartText(est.cancelflag) || '0',
          dynamicflag: bartText(est.dynamicflag) || '0'
        }))
      }))
    }));
    let total = stations.reduce(
      (sum, s) => sum + s.departures.reduce((count, d) => count + d.estimates.length, 0),
      0
    );
    return {
      output: { date: bartText(result.date), time: bartText(result.time), stations },
      message: `Retrieved **${total}** departure estimate(s) across **${stations.length}** station(s).`
    };
  })
  .build();
