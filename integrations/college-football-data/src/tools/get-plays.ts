import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPlays = SlateTool.create(spec, {
  name: 'Get Plays & Drives',
  key: 'get_plays',
  description: `Retrieve play-by-play data and/or drive-level summaries for college football games. Play data includes down, distance, yard line, play type, and PPA values. Drive data includes start/end position, number of plays, yards gained, and result.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      year: z.number().describe('Season year (required)'),
      week: z.number().describe('Week number (required)'),
      team: z.string().optional().describe('Team name to filter by'),
      offense: z.string().optional().describe('Offensive team to filter by'),
      defense: z.string().optional().describe('Defensive team to filter by'),
      conference: z.string().optional().describe('Conference abbreviation to filter by'),
      playType: z
        .string()
        .optional()
        .describe('Play type to filter by (e.g. "Rush", "Pass Reception")'),
      seasonType: z.enum(['regular', 'postseason', 'both']).optional().describe('Season type'),
      includeDrives: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to also include drive-level data')
    })
  )
  .output(
    z.object({
      plays: z.array(z.any()).describe('Play-by-play data'),
      drives: z.array(z.any()).optional().describe('Drive-level summaries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let plays = await client.getPlays({
      year: ctx.input.year,
      week: ctx.input.week,
      team: ctx.input.team,
      offense: ctx.input.offense,
      defense: ctx.input.defense,
      conference: ctx.input.conference,
      playType: ctx.input.playType,
      seasonType: ctx.input.seasonType
    });

    let drives: any;
    if (ctx.input.includeDrives) {
      drives = await client.getDrives({
        year: ctx.input.year,
        week: ctx.input.week,
        team: ctx.input.team,
        offense: ctx.input.offense,
        defense: ctx.input.defense,
        conference: ctx.input.conference
      });
    }

    let playCount = Array.isArray(plays) ? plays.length : 0;
    let driveCount = drives && Array.isArray(drives) ? drives.length : 0;
    return {
      output: { plays, drives },
      message: `Retrieved **${playCount}** play(s)${ctx.input.includeDrives ? ` and **${driveCount}** drive(s)` : ''} for week ${ctx.input.week} of ${ctx.input.year}.`
    };
  })
  .build();
