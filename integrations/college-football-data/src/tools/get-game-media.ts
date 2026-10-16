import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGameMedia = SlateTool.create(spec, {
  name: 'Get Game Media',
  key: 'get_game_media',
  description:
    'Retrieve broadcast networks and media information for games in a season, with optional week, team, conference, and season filters.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      year: z.number().describe('Season year'),
      week: z.number().optional().describe('Week number'),
      team: z.string().optional().describe('Team name'),
      conference: z.string().optional().describe('Conference name or abbreviation'),
      seasonType: z
        .enum([
          'regular',
          'postseason',
          'both',
          'allstar',
          'spring_regular',
          'spring_postseason'
        ])
        .optional()
        .describe('Season type')
    })
  )
  .output(z.object({ media: z.array(z.any()).describe('Game broadcast and media records') }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let media = await client.getGameMedia(ctx.input);
    return { output: { media }, message: 'Retrieved game broadcast information.' };
  })
  .build();
