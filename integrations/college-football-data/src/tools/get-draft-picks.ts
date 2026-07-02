import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDraftPicks = SlateTool.create(spec, {
  name: 'Get NFL Draft Picks',
  key: 'get_draft_picks',
  description: `Retrieve NFL Draft pick data for college football players. Filter by draft year, NFL team, college program, or position. Includes round, pick number, pre-draft grades, and player details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      year: z.number().optional().describe('NFL Draft year'),
      nflTeam: z.string().optional().describe('NFL team name'),
      college: z.string().optional().describe('College program name'),
      position: z.string().optional().describe('Position to filter by')
    })
  )
  .output(
    z.object({
      picks: z.array(z.any()).describe('Array of NFL Draft pick records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let picks = await client.getDraftPicks(ctx.input);

    let count = Array.isArray(picks) ? picks.length : 0;
    return {
      output: { picks },
      message: `Found **${count}** draft pick(s).`
    };
  })
  .build();
