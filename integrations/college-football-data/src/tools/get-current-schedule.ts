import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentSchedule = SlateTool.create(spec, {
  name: 'Get Current Schedule',
  key: 'get_current_schedule',
  description:
    'Retrieve the active or next calendar slate, including completed games. For an explicit window, supply year, seasonType, and week together.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      year: z.number().optional().describe('Season year; requires seasonType and week'),
      seasonType: z
        .enum(['regular', 'postseason'])
        .optional()
        .describe('Season type; requires year and week'),
      week: z.number().optional().describe('Week number; requires year and seasonType'),
      classification: z.enum(['fbs', 'fcs']).optional().describe('Division classification'),
      conference: z.string().optional().describe('Conference abbreviation')
    })
  )
  .output(
    z.object({
      schedule: z
        .any()
        .describe('Complete schedule window, following window, filters, and game metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let schedule = await client.getSchedule(ctx.input);
    return { output: { schedule }, message: 'Retrieved the schedule slate.' };
  })
  .build();
