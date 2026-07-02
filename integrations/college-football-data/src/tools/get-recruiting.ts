import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRecruiting = SlateTool.create(spec, {
  name: 'Get Recruiting',
  key: 'get_recruiting',
  description: `Retrieve college football recruiting data, including individual recruit rankings/ratings, team recruiting class rankings, and aggregated positional group ratings. Filter by year, team, position, state, or recruit classification (high school, JUCO, prep school).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      year: z.number().optional().describe('Recruiting class year'),
      team: z.string().optional().describe('Team name to filter by'),
      position: z.string().optional().describe('Position to filter by'),
      state: z.string().optional().describe('State abbreviation to filter recruits by'),
      classification: z
        .enum(['HighSchool', 'JUCO', 'PrepSchool'])
        .optional()
        .describe('Recruit classification type'),
      includeTeamRankings: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include team recruiting class rankings'),
      includePlayerRankings: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include individual recruit player rankings'),
      includePositionGroups: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include aggregated positional group recruiting data')
    })
  )
  .output(
    z.object({
      recruits: z
        .array(z.any())
        .optional()
        .describe('Individual recruit ratings and rankings'),
      teamRankings: z.array(z.any()).optional().describe('Team recruiting class rankings'),
      positionGroups: z
        .array(z.any())
        .optional()
        .describe('Aggregated positional group recruiting data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let results: any = {};

    if (ctx.input.includePlayerRankings) {
      results.recruits = await client.getRecruits({
        year: ctx.input.year,
        team: ctx.input.team,
        position: ctx.input.position,
        state: ctx.input.state,
        classification: ctx.input.classification
      });
    }

    if (ctx.input.includeTeamRankings) {
      results.teamRankings = await client.getTeamRecruitingRankings({
        year: ctx.input.year,
        team: ctx.input.team
      });
    }

    if (ctx.input.includePositionGroups) {
      results.positionGroups = await client.getRecruitingGroups({
        team: ctx.input.team,
        startYear: ctx.input.year,
        endYear: ctx.input.year
      });
    }

    let parts: string[] = [];
    if (results.recruits)
      parts.push(
        `${Array.isArray(results.recruits) ? results.recruits.length : 0} recruit(s)`
      );
    if (results.teamRankings) parts.push('team rankings');
    if (results.positionGroups) parts.push('position group data');

    return {
      output: results,
      message: `Retrieved recruiting data: ${parts.join(', ')}${ctx.input.year ? ` for ${ctx.input.year}` : ''}${ctx.input.team ? ` (${ctx.input.team})` : ''}.`
    };
  })
  .build();
