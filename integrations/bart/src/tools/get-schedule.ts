import { SlateTool } from 'slates';
import { z } from 'zod';
import { BartClient } from '../lib/client';
import { spec } from '../spec';

let scheduleVersionSchema = z.object({
  scheduleId: z.string().describe('Schedule version ID'),
  effectiveDate: z.string().describe('Date this schedule became effective')
});

let stationScheduleItemSchema = z.object({
  line: z.string().describe('Route line identifier'),
  trainHeadStation: z.string().describe('Final destination of the train'),
  originTime: z.string().describe('Departure time from this station'),
  bikeflag: z.string().describe('"1" if bikes are allowed'),
  platform: z.string().describe('Platform designation')
});

let routeScheduleStopSchema = z.object({
  station: z.string().describe('Station abbreviation'),
  originTime: z.string().describe('Departure time from this station'),
  bikeflag: z.string().describe('"1" if bikes are allowed')
});

let routeScheduleTrainSchema = z.object({
  trainIndex: z.string().describe('Train index number'),
  stops: z.array(routeScheduleStopSchema).describe('Ordered stops for this train')
});

export let getSchedule = SlateTool.create(spec, {
  name: 'Get Schedule',
  key: 'get_schedule',
  description: `Retrieve BART schedule information. Can list available schedule versions, get the full daily schedule for a specific station, or get the complete schedule for a specific route. Station schedules show all departures for the day; route schedules show every train run with all stop times.`,
  instructions: [
    'Use station abbreviation codes for station schedules (e.g., "12TH", "EMBR").',
    'Route numbers range from 1-12 for route schedules.',
    'Date format: "mm/dd/yyyy", "today", "now". For route schedules, also "wd" (weekday), "sa" (Saturday), "su" (Sunday).',
    'Time format for route schedules: "h:mm am/pm" to filter by start time.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scheduleType: z
        .enum(['versions', 'station', 'route'])
        .describe(
          '"versions" to list schedule versions, "station" for a station schedule, "route" for a route schedule'
        ),
      stationAbbr: z
        .string()
        .optional()
        .describe('Station abbreviation code (required when scheduleType is "station")'),
      routeNumber: z
        .string()
        .optional()
        .describe('Route number 1-12 (required when scheduleType is "route")'),
      date: z
        .string()
        .optional()
        .describe(
          'Schedule date in "mm/dd/yyyy" format, "today", "now", or "wd"/"sa"/"su" for route schedules'
        ),
      time: z
        .string()
        .optional()
        .describe('Start time filter for route schedules in "h:mm am/pm" format')
    })
  )
  .output(
    z.object({
      scheduleVersions: z
        .array(scheduleVersionSchema)
        .optional()
        .describe('Available schedule versions'),
      stationSchedule: z
        .object({
          stationName: z.string().describe('Station name'),
          stationAbbr: z.string().describe('Station abbreviation'),
          scheduleDate: z.string().describe('Schedule date'),
          scheduleNumber: z.string().describe('Schedule version number'),
          items: z.array(stationScheduleItemSchema).describe('Scheduled departures')
        })
        .optional()
        .describe('Station schedule (when scheduleType is "station")'),
      routeSchedule: z
        .object({
          scheduleDate: z.string().describe('Schedule date'),
          scheduleNumber: z.string().describe('Schedule version number'),
          trains: z.array(routeScheduleTrainSchema).describe('Train runs with stop times')
        })
        .optional()
        .describe('Route schedule (when scheduleType is "route")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BartClient({ token: ctx.auth.token });

    if (ctx.input.scheduleType === 'versions') {
      let result = await client.getSchedules();
      let schedData = result?.schedules?.schedule;
      let schedules = Array.isArray(schedData) ? schedData : schedData ? [schedData] : [];

      let mappedSchedules = schedules.map((s: any) => ({
        scheduleId: s['@id'] || '',
        effectiveDate: s['@effectivedate'] || ''
      }));

      return {
        output: { scheduleVersions: mappedSchedules },
        message: `Retrieved **${mappedSchedules.length}** schedule version(s).`
      };
    }

    if (ctx.input.scheduleType === 'station') {
      if (!ctx.input.stationAbbr) {
        throw new Error('stationAbbr is required when scheduleType is "station"');
      }

      let result = await client.getStationSchedule(ctx.input.stationAbbr, ctx.input.date);
      let station = result?.station;
      let itemData = station?.item;
      let items = Array.isArray(itemData) ? itemData : itemData ? [itemData] : [];

      let mappedItems = items.map((item: any) => ({
        line: item['@line'] || '',
        trainHeadStation: item['@trainHeadStation'] || '',
        originTime: item['@origTime'] || '',
        bikeflag: item['@bikeflag'] || '0',
        platform: item['@platform'] || ''
      }));

      return {
        output: {
          stationSchedule: {
            stationName: station?.name || '',
            stationAbbr: station?.abbr || '',
            scheduleDate: result?.date || '',
            scheduleNumber: result?.sched_num || '',
            items: mappedItems
          }
        },
        message: `Retrieved **${mappedItems.length}** scheduled departures for **${station?.name || ctx.input.stationAbbr}**.`
      };
    }

    // Route schedule
    if (!ctx.input.routeNumber) {
      throw new Error('routeNumber is required when scheduleType is "route"');
    }

    let result = await client.getRouteSchedule({
      route: ctx.input.routeNumber,
      date: ctx.input.date,
      time: ctx.input.time
    });

    let route = result?.route;
    let trainData = route?.train;
    let trains = Array.isArray(trainData) ? trainData : trainData ? [trainData] : [];

    let mappedTrains = trains.map((train: any) => {
      let stopData = train.stop;
      let stops = Array.isArray(stopData) ? stopData : stopData ? [stopData] : [];

      return {
        trainIndex: train['@index'] || '',
        stops: stops.map((stop: any) => ({
          station: stop['@station'] || '',
          originTime: stop['@origTime'] || '',
          bikeflag: stop['@bikeflag'] || '0'
        }))
      };
    });

    return {
      output: {
        routeSchedule: {
          scheduleDate: result?.date || '',
          scheduleNumber: result?.sched_num || '',
          trains: mappedTrains
        }
      },
      message: `Retrieved schedule with **${mappedTrains.length}** train run(s) for route **${ctx.input.routeNumber}**.`
    };
  })
  .build();
