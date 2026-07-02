import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRankingsRatings = SlateTool.create(spec, {
  name: 'Get Rankings & Ratings',
  key: 'get_rankings_ratings',
  description: `Retrieve college football poll rankings (AP, Coaches) and/or advanced team rating systems. Supports SP+ (efficiency), SRS (Simple Rating System), Elo, and FPI (Football Power Index). Select which rating systems to include.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      year: z.number().describe('Season year'),
      week: z
        .number()
        .optional()
        .describe('Week number for rankings (if omitted, returns all weeks)'),
      team: z.string().optional().describe('Team name to filter ratings by'),
      conference: z.string().optional().describe('Conference abbreviation to filter by'),
      seasonType: z
        .enum(['regular', 'postseason', 'both'])
        .optional()
        .describe('Season type for rankings'),
      includePollRankings: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include AP/Coaches poll rankings'),
      includeSP: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include SP+ efficiency ratings'),
      includeSRS: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include Simple Rating System ratings'),
      includeElo: z.boolean().optional().default(false).describe('Include Elo ratings'),
      includeFPI: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include Football Power Index ratings')
    })
  )
  .output(
    z.object({
      rankings: z
        .array(z.any())
        .optional()
        .describe('Weekly poll rankings (AP, Coaches, etc.)'),
      spRatings: z.array(z.any()).optional().describe('SP+ efficiency ratings'),
      srsRatings: z.array(z.any()).optional().describe('Simple Rating System ratings'),
      eloRatings: z.array(z.any()).optional().describe('Elo ratings'),
      fpiRatings: z.array(z.any()).optional().describe('Football Power Index ratings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let results: any = {};

    if (ctx.input.includePollRankings) {
      results.rankings = await client.getRankings({
        year: ctx.input.year,
        week: ctx.input.week,
        seasonType: ctx.input.seasonType
      });
    }

    if (ctx.input.includeSP) {
      results.spRatings = await client.getSPRatings({
        year: ctx.input.year,
        team: ctx.input.team
      });
    }

    if (ctx.input.includeSRS) {
      results.srsRatings = await client.getSRSRatings({
        year: ctx.input.year,
        team: ctx.input.team,
        conference: ctx.input.conference
      });
    }

    if (ctx.input.includeElo) {
      results.eloRatings = await client.getEloRatings({
        year: ctx.input.year,
        week: ctx.input.week,
        team: ctx.input.team,
        conference: ctx.input.conference
      });
    }

    if (ctx.input.includeFPI) {
      results.fpiRatings = await client.getFPIRatings({
        year: ctx.input.year,
        team: ctx.input.team,
        conference: ctx.input.conference
      });
    }

    let parts: string[] = [];
    if (results.rankings) parts.push('poll rankings');
    if (results.spRatings) parts.push('SP+');
    if (results.srsRatings) parts.push('SRS');
    if (results.eloRatings) parts.push('Elo');
    if (results.fpiRatings) parts.push('FPI');

    return {
      output: results,
      message: `Retrieved ${parts.join(', ')} for ${ctx.input.year}${ctx.input.team ? ` (${ctx.input.team})` : ''}.`
    };
  })
  .build();
