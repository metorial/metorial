import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleMapsClient } from '../lib/client';
import { spec } from '../spec';

export let getTimezoneTool = SlateTool.create(spec, {
  name: 'Get Time Zone',
  key: 'get_timezone',
  description: `Determine the time zone for a given geographic location. Returns the time zone ID (e.g. "America/New_York"), display name, and UTC offset including DST adjustments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Latitude of the location'),
      longitude: z.number().describe('Longitude of the location'),
      timestamp: z
        .number()
        .optional()
        .describe(
          'Unix timestamp in seconds to determine DST status. Defaults to current time.'
        ),
      language: z
        .string()
        .optional()
        .describe('Language for the time zone name (e.g. "en", "fr")')
    })
  )
  .output(
    z.object({
      timeZoneId: z.string().describe('IANA time zone identifier (e.g. "America/New_York")'),
      timeZoneName: z
        .string()
        .describe('Localized time zone name (e.g. "Eastern Standard Time")'),
      rawUtcOffsetSeconds: z.number().describe('UTC offset in seconds (without DST)'),
      dstOffsetSeconds: z
        .number()
        .describe('DST offset in seconds (0 if DST is not in effect)'),
      totalUtcOffsetSeconds: z.number().describe('Total UTC offset including DST, in seconds'),
      totalUtcOffsetHours: z.number().describe('Total UTC offset including DST, in hours')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleMapsClient({ token: ctx.auth.token });

    let response = await client.getTimeZone({
      latitude: ctx.input.latitude,
      longitude: ctx.input.longitude,
      timestamp: ctx.input.timestamp,
      language: ctx.input.language
    });

    if (response.status !== 'OK') {
      throw new Error(`Time zone request failed: ${response.status}`);
    }

    let totalOffset = (response.rawOffset as number) + (response.dstOffset as number);

    let output = {
      timeZoneId: response.timeZoneId as string,
      timeZoneName: response.timeZoneName as string,
      rawUtcOffsetSeconds: response.rawOffset as number,
      dstOffsetSeconds: response.dstOffset as number,
      totalUtcOffsetSeconds: totalOffset,
      totalUtcOffsetHours: totalOffset / 3600
    };

    let sign = output.totalUtcOffsetHours >= 0 ? '+' : '';
    let message = `Time zone: **${output.timeZoneId}** (${output.timeZoneName}), UTC${sign}${output.totalUtcOffsetHours}.`;

    return { output, message };
  })
  .build();
