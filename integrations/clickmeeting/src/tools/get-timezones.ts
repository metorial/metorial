import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTimezones = SlateTool.create(spec, {
  name: 'Get Timezones',
  key: 'get_timezones',
  description: `Retrieves available timezones. Optionally filter by country using a 2-letter ISO country code.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      country: z
        .string()
        .optional()
        .describe(
          'ISO 3166-1 alpha-2 country code to filter timezones (e.g. "US", "DE", "PL")'
        )
    })
  )
  .output(
    z.object({
      timezones: z.record(z.string(), z.unknown()).describe('Available timezones')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let timezones = await client.getTimezones(ctx.input.country);

    return {
      output: { timezones },
      message: `Retrieved timezones${ctx.input.country ? ` for country **${ctx.input.country}**` : ''}.`
    };
  })
  .build();
