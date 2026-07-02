import { SlateTool } from 'slates';
import { z } from 'zod';
import { BartClient } from '../lib/client';
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
    'You cannot combine platform and direction filters. If platform is specified, direction is ignored.',
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

    let result = await client.getEstimatedDepartures({
      station: ctx.input.station,
      platform: ctx.input.platform,
      direction: ctx.input.direction
    });

    let stationData = result?.station;
    let stations = Array.isArray(stationData) ? stationData : stationData ? [stationData] : [];

    let mappedStations = stations.map((s: any) => {
      let etdData = Array.isArray(s.etd) ? s.etd : s.etd ? [s.etd] : [];
      return {
        stationName: s.name,
        stationAbbr: s.abbr,
        departures: etdData.map((etd: any) => {
          let estimates = Array.isArray(etd.estimate)
            ? etd.estimate
            : etd.estimate
              ? [etd.estimate]
              : [];
          return {
            destination: etd.destination,
            abbreviation: etd.abbreviation,
            limited: etd.limited || '0',
            estimates: estimates.map((est: any) => ({
              minutes: est.minutes,
              platform: est.platform,
              direction: est.direction,
              length: est.length,
              color: est.color,
              hexcolor: est.hexcolor,
              bikeflag: est.bikeflag,
              delay: est.delay,
              cancelflag: est.cancelflag || '0',
              dynamicflag: est.dynamicflag || '0'
            }))
          };
        })
      };
    });

    let totalDepartures = mappedStations.reduce(
      (sum: number, s: any) =>
        sum + s.departures.reduce((dSum: number, d: any) => dSum + d.estimates.length, 0),
      0
    );

    return {
      output: {
        date: result?.date || '',
        time: result?.time || '',
        stations: mappedStations
      },
      message: `Retrieved **${totalDepartures}** departure estimate(s) across **${mappedStations.length}** station(s).`
    };
  })
  .build();
