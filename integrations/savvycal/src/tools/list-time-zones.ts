import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTimeZonesTool = SlateTool.create(spec, {
  name: 'List Time Zones',
  key: 'list_time_zones',
  description: `List all supported time zones in SavvyCal. Returns IANA time zone identifiers with their abbreviations and UTC offsets. Useful for creating events or scheduling links with the correct time zone.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      timeZones: z.array(
        z.object({
          timeZoneId: z
            .string()
            .describe('IANA time zone identifier (e.g., "America/New_York")'),
          abbreviation: z.string().optional().describe('Time zone abbreviation (e.g., "EST")'),
          offset: z.number().optional().describe('UTC offset in seconds'),
          formattedOffset: z
            .string()
            .optional()
            .describe('Human-readable offset (e.g., "-05:00")')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listTimeZones();

    let entries = Array.isArray(data) ? data : (data.entries ?? []);

    let timeZones = entries.map((tz: any) => ({
      timeZoneId: tz.id ?? tz.name,
      abbreviation: tz.abbreviation,
      offset: tz.offset,
      formattedOffset: tz.formatted_offset
    }));

    return {
      output: { timeZones },
      message: `Found **${timeZones.length}** supported time zone(s).`
    };
  })
  .build();
