import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTeamInfo = SlateTool.create(spec, {
  name: 'Get Team Info',
  key: 'get_team_info',
  description: `Look up college football team information including roster, talent ratings, season records, and against-the-spread records. Can return details for a specific team or list teams by conference. Combines multiple team data sources into a single response.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      team: z
        .string()
        .optional()
        .describe('Team name to look up (e.g. "Alabama", "Ohio State")'),
      conference: z
        .string()
        .optional()
        .describe('Conference abbreviation to filter teams (e.g. "SEC", "B1G")'),
      year: z.number().optional().describe('Season year for roster, talent, and records'),
      includeRoster: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include the team roster'),
      includeTalent: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include 247 talent composite ratings (requires year)'),
      includeRecords: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include season win/loss records (requires year)'),
      includeATS: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include against-the-spread records (requires year)')
    })
  )
  .output(
    z.object({
      teams: z.array(z.any()).describe('Array of team information objects'),
      roster: z.array(z.any()).optional().describe('Team roster with player details'),
      talent: z.array(z.any()).optional().describe('Team talent composite ratings'),
      records: z.array(z.any()).optional().describe('Season win/loss records'),
      atsRecords: z.array(z.any()).optional().describe('Against-the-spread records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let teams = await client.getTeams({
      conference: ctx.input.conference,
      year: ctx.input.year
    });
    if (ctx.input.team) {
      teams = Array.isArray(teams)
        ? teams.filter((t: any) => t.school?.toLowerCase() === ctx.input.team?.toLowerCase())
        : teams;
    }

    let roster: any;
    if (ctx.input.includeRoster) {
      roster = await client.getRoster({ team: ctx.input.team, year: ctx.input.year });
    }

    let talent: any;
    if (ctx.input.includeTalent && ctx.input.year) {
      talent = await client.getTalent({ year: ctx.input.year });
      if (ctx.input.team) {
        talent = Array.isArray(talent)
          ? talent.filter(
              (t: any) => t.school?.toLowerCase() === ctx.input.team?.toLowerCase()
            )
          : talent;
      }
    }

    let records: any;
    if (ctx.input.includeRecords && ctx.input.year) {
      records = await client.getRecords({
        year: ctx.input.year,
        team: ctx.input.team,
        conference: ctx.input.conference
      });
    }

    let atsRecords: any;
    if (ctx.input.includeATS && ctx.input.year) {
      atsRecords = await client.getTeamATS({
        year: ctx.input.year,
        team: ctx.input.team,
        conference: ctx.input.conference
      });
    }

    let teamCount = Array.isArray(teams) ? teams.length : 0;
    return {
      output: { teams, roster, talent, records, atsRecords },
      message: `Found **${teamCount}** team(s)${ctx.input.team ? ` matching "${ctx.input.team}"` : ''}${ctx.input.includeRoster ? ' with roster' : ''}${ctx.input.includeTalent ? ', talent ratings' : ''}${ctx.input.includeRecords ? ', records' : ''}${ctx.input.includeATS ? ', ATS records' : ''}.`
    };
  })
  .build();
