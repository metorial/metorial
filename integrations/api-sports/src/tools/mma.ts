import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

const input = z.object({
  id: z.number().describe('Fight ID from get_fixtures with sport mma')
});
const output = z.object({
  data: z.unknown().describe('Original MMA fight records'),
  raw: z.unknown().describe('Complete provider response')
});

export const getMmaFightResultsTool = SlateTool.create(spec, {
  key: 'get_mma_fight_results',
  name: 'Get MMA Fight Results',
  description:
    'Retrieve the finish method, round, time and scorecards for an MMA fight when available.',
  tags: { readOnly: true }
})
  .input(input)
  .output(output)
  .handleInvocation(async ctx => {
    const data = await new Client({ token: ctx.auth.token, sport: 'mma' }).getMmaFightResults(
      ctx.input.id
    );
    return {
      output: { data: data.response, raw: data },
      message: 'Retrieved MMA fight results.'
    };
  })
  .build();

export const getMmaFighterStatisticsTool = SlateTool.create(spec, {
  key: 'get_mma_fighter_statistics',
  name: 'Get MMA Fighter Statistics',
  description:
    'Retrieve original fighter statistics from an MMA fight, including strikes, takedowns and submission metrics when available.',
  tags: { readOnly: true }
})
  .input(input)
  .output(output)
  .handleInvocation(async ctx => {
    const data = await new Client({
      token: ctx.auth.token,
      sport: 'mma'
    }).getMmaFighterStatistics(ctx.input.id);
    return {
      output: { data: data.response, raw: data },
      message: 'Retrieved MMA fighter statistics.'
    };
  })
  .build();
