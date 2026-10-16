import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSeasonCalendar = SlateTool.create(spec, {
  name: 'Get Season Calendar',
  key: 'get_season_calendar',
  description:
    'Retrieve week boundaries and season types for a college football season. Use these weeks to query games, plays, and rankings.',
  tags: { readOnly: true }
})
  .input(z.object({ year: z.number().describe('Season year') }))
  .output(
    z.object({
      calendar: z
        .array(z.any())
        .describe('Week-by-week calendar with provider season types and dates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let calendar = await client.getCalendar(ctx.input);
    return { output: { calendar }, message: 'Retrieved the season calendar.' };
  })
  .build();
