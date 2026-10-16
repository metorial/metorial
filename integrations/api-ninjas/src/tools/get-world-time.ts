import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { locationParams } from '../lib/location';
import { spec } from '../spec';

export let getWorldTime = SlateTool.create(spec, {
  name: 'Get World Time',
  key: 'get_world_time',
  description:
    'Get the local date, time zone, UTC offset, and daylight-saving status for a timezone, city, or coordinates.',
  instructions: [
    'Provide timezone, lat and lon, or city. When several are provided, timezone takes precedence, then coordinates.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      timezone: z.string().optional().describe('IANA timezone, such as Europe/London'),
      lat: z.number().min(-90).max(90).optional().describe('Latitude; provide lon as well'),
      lon: z.number().min(-180).max(180).optional().describe('Longitude; provide lat as well'),
      city: z.string().optional().describe('City name'),
      state: z.string().optional().describe('US state, for city lookups'),
      country: z.string().optional().describe('Country name, for city lookups')
    })
  )
  .output(
    z.object({
      timezone: z.string(),
      datetime: z.string(),
      date: z.string().optional(),
      dayOfWeek: z.string().optional(),
      utcOffset: z.string().optional(),
      utcDatetime: z.string().optional(),
      unixTime: z.number().optional(),
      daylightSaving: z.boolean().optional(),
      raw: z.unknown().optional().describe('Original provider response')
    })
  )
  .handleInvocation(async ctx => {
    let params = ctx.input.timezone?.trim()
      ? { timezone: ctx.input.timezone }
      : locationParams(ctx.input);
    let result = await new Client(ctx.auth).getWorldTime(params);
    return {
      output: {
        timezone: result.timezone,
        datetime: result.datetime,
        date: result.date ?? undefined,
        dayOfWeek: result.day_of_week ?? undefined,
        utcOffset: result.utc_offset ?? undefined,
        utcDatetime: result.utc_datetime ?? undefined,
        unixTime: result.unixtime ?? undefined,
        daylightSaving: result.dst ?? undefined,
        raw: result
      },
      message: `Local time in ${result.timezone}: ${result.datetime}.`
    };
  })
  .build();
