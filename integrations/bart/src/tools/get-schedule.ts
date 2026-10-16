import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BartClient } from '../lib/client';
import { bartRecord, bartRecords, bartText } from '../lib/response';
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
    'Call get_route_info to discover route numbers for route schedules.',
    'Date format: "mm/dd/yyyy", "today", "now". For route schedules, also "wd" (weekday), "sa" (Saturday), "su" (Sunday).',
    'Omit time for route schedules: BART no longer supports a start-time filter. Use plan_trip for time-based itineraries.'
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
        .describe('Route number from get_route_info (required when scheduleType is "route")'),
      date: z
        .string()
        .optional()
        .describe(
          'Schedule date in "mm/dd/yyyy" format, "today", "now", or "wd"/"sa"/"su" for route schedules'
        ),
      time: z
        .string()
        .optional()
        .describe(
          'Legacy field retained for compatibility. Omit for route schedules; BART no longer supports time filtering. Use plan_trip for time-based itineraries.'
        )
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
      let schedules = bartRecords(bartRecord(result.schedules).schedule).map(s => ({
        scheduleId: bartText(s['@id']),
        effectiveDate: bartText(s['@effectivedate'])
      }));
      return {
        output: { scheduleVersions: schedules },
        message: `Retrieved **${schedules.length}** schedule version(s).`
      };
    }
    if (ctx.input.scheduleType === 'station') {
      if (!ctx.input.stationAbbr?.trim()) {
        throw createApiServiceError(
          'stationAbbr is required when scheduleType is "station". Call get_station_info to find station abbreviations.'
        );
      }
      let result = await client.getStationSchedule(ctx.input.stationAbbr, ctx.input.date);
      let station = bartRecords(result.station)[0] ?? {};
      let items = bartRecords(station.item).map(item => ({
        line: bartText(item['@line']),
        trainHeadStation: bartText(item['@trainHeadStation']),
        originTime: bartText(item['@origTime']),
        bikeflag: bartText(item['@bikeflag']) || '0',
        platform: bartText(item['@platform'])
      }));
      return {
        output: {
          stationSchedule: {
            stationName: bartText(station.name),
            stationAbbr: bartText(station.abbr),
            scheduleDate: bartText(result.date),
            scheduleNumber: bartText(result.sched_num),
            items
          }
        },
        message: `Retrieved **${items.length}** scheduled departures for **${bartText(station.name) || ctx.input.stationAbbr}**.`
      };
    }
    if (!ctx.input.routeNumber?.trim()) {
      throw createApiServiceError(
        'routeNumber is required when scheduleType is "route". Call get_route_info to discover route numbers.'
      );
    }
    let result = await client.getRouteSchedule({
      route: ctx.input.routeNumber,
      date: ctx.input.date,
      time: ctx.input.time
    });
    let trains = bartRecords(bartRecord(result.route).train).map(train => ({
      trainIndex: bartText(train['@index']),
      stops: bartRecords(train.stop).map(stop => ({
        station: bartText(stop['@station']),
        originTime: bartText(stop['@origTime']),
        bikeflag: bartText(stop['@bikeflag']) || '0'
      }))
    }));
    return {
      output: {
        routeSchedule: {
          scheduleDate: bartText(result.date),
          scheduleNumber: bartText(result.sched_num),
          trains
        }
      },
      message: `Retrieved schedule with **${trains.length}** train run(s) for route **${ctx.input.routeNumber}**.`
    };
  })
  .build();
