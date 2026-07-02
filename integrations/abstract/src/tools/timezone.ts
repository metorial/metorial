import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbstractClient } from '../lib/client';
import { spec } from '../spec';

let timezoneInfoSchema = z.object({
  requestedLocation: z.string().optional().describe('The requested location'),
  datetime: z.string().optional().describe('Current date and time at the location'),
  timezone: z.string().optional().describe('Timezone name (e.g. America/New_York)'),
  timezoneAbbreviation: z.string().optional().describe('Timezone abbreviation (e.g. EST)'),
  utcOffset: z.string().optional().describe('UTC offset (e.g. -05:00)'),
  isDst: z.boolean().optional().describe('Whether daylight saving time is active'),
  gmtOffset: z.number().optional().describe('GMT offset in seconds')
});

export let timezone = SlateTool.create(spec, {
  name: 'Timezone',
  key: 'timezone',
  description: `Gets the current time for a location or converts a datetime between timezones. Supports two modes:
- **Current time**: Get the current date/time at any location
- **Convert**: Convert a specific datetime from one timezone to another`,
  instructions: [
    'Locations can be city names (e.g. "New York"), timezone names (e.g. "America/New_York"), or coordinates.',
    'For conversion, provide the datetime in "YYYY-MM-DD HH:MM:SS" format.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z
        .enum(['current_time', 'convert'])
        .describe(
          'Operation mode: "current_time" to get current time at a location, "convert" to convert between timezones'
        ),
      location: z
        .string()
        .describe(
          'The location/timezone for current time lookup or the base location for conversion'
        ),
      targetLocation: z
        .string()
        .optional()
        .describe('Target location/timezone for conversion. Required when mode is "convert".'),
      datetime: z
        .string()
        .optional()
        .describe(
          'Datetime to convert in "YYYY-MM-DD HH:MM:SS" format. Required when mode is "convert".'
        )
    })
  )
  .output(
    z.object({
      baseTimezone: timezoneInfoSchema
        .optional()
        .describe('Timezone info for the base/requested location'),
      targetTimezone: timezoneInfoSchema
        .optional()
        .describe('Timezone info for the target location (conversion mode only)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbstractClient(ctx.auth);
    let { mode, location, targetLocation, datetime } = ctx.input;

    if (mode === 'convert') {
      if (!targetLocation) throw new Error('targetLocation is required for "convert" mode.');
      if (!datetime) throw new Error('datetime is required for "convert" mode.');

      let result = await client.convertTimezone({
        baseLocation: location,
        baseDatetime: datetime,
        targetLocation
      });

      let mapTimezoneInfo = (data: any) => ({
        requestedLocation: data?.requested_location ?? undefined,
        datetime: data?.datetime ?? undefined,
        timezone: data?.timezone_name ?? undefined,
        timezoneAbbreviation: data?.timezone_abbreviation ?? undefined,
        utcOffset: data?.utc_offset ?? undefined,
        isDst: data?.is_dst ?? undefined,
        gmtOffset: data?.gmt_offset != null ? Number(data.gmt_offset) : undefined
      });

      return {
        output: {
          baseTimezone: result.base_location
            ? mapTimezoneInfo(result.base_location)
            : undefined,
          targetTimezone: result.target_location
            ? mapTimezoneInfo(result.target_location)
            : undefined
        },
        message: `Converted **${datetime}** from **${location}** to **${targetLocation}**: **${result.target_location?.datetime ?? 'unknown'}**.`
      };
    } else {
      let result = await client.getCurrentTime({ location });

      return {
        output: {
          baseTimezone: {
            requestedLocation: result.requested_location ?? location,
            datetime: result.datetime ?? undefined,
            timezone: result.timezone_name ?? undefined,
            timezoneAbbreviation: result.timezone_abbreviation ?? undefined,
            utcOffset: result.utc_offset ?? undefined,
            isDst: result.is_dst ?? undefined,
            gmtOffset: result.gmt_offset != null ? Number(result.gmt_offset) : undefined
          }
        },
        message: `Current time in **${location}**: **${result.datetime ?? 'unknown'}** (${result.timezone_abbreviation ?? result.timezone_name ?? ''}).`
      };
    }
  })
  .build();
