import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPlayoffBracket = SlateTool.create(spec, {
  name: 'Get Playoff Bracket',
  key: 'get_playoff_bracket',
  description:
    'Retrieve the complete College Football Playoff bracket for a season, including participants, rounds, matchups, and champion when available.',
  tags: { readOnly: true }
})
  .input(z.object({ year: z.number().describe('Season year') }))
  .output(
    z.object({
      bracket: z.any().describe('Complete playoff bracket and participant metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let bracket = await client.getPlayoffBracket(ctx.input);
    return { output: { bracket }, message: 'Retrieved the College Football Playoff bracket.' };
  })
  .build();
