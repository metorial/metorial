import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { timeZoneSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getTimezoneInfoTool = SlateTool.create(spec, {
  name: 'Get Time Zone Information',
  key: 'get_timezone_info',
  description:
    'Get the UTC offset, daylight saving status and local time for an IANA time zone. Optionally convert a UTC Unix timestamp to local time.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      timeZoneId: z
        .string()
        .min(1)
        .describe('IANA time zone identifier, such as Australia/Sydney'),
      utcReference: z
        .number()
        .int()
        .optional()
        .describe('UTC reference in Unix seconds; omitted to use the current time')
    })
  )
  .output(timeZoneSchema)
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).timezoneInfo(ctx.input);
    return {
      output: result,
      message: `Retrieved time zone information for ${ctx.input.timeZoneId}.`
    };
  })
  .build();
