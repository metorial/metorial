import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let teamSchema = z.object({
  teamId: z.number().describe('Unique team ID'),
  name: z.string().describe('Team name'),
  code: z.string().nullable().describe('Team code/abbreviation'),
  country: z.string().nullable().describe('Country'),
  founded: z.number().nullable().describe('Year the team was founded'),
  national: z.boolean().nullable().describe('Whether this is a national team'),
  logo: z.string().nullable().describe('URL of the team logo'),
  venueName: z.string().nullable().describe('Home venue name'),
  venueCity: z.string().nullable().describe('Venue city'),
  venueCapacity: z.number().nullable().describe('Venue capacity'),
  venueImage: z.string().nullable().describe('URL of the venue image')
});

export let searchTeamsTool = SlateTool.create(spec, {
  name: 'Search Teams',
  key: 'search_teams',
  description: `Search for teams across any supported sport. Filter by league, country, or name. Returns team details including venue information and logos. Use this to discover team IDs for use with other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sport: z
        .enum([
          'football',
          'basketball',
          'baseball',
          'hockey',
          'rugby',
          'handball',
          'volleyball',
          'afl',
          'nba',
          'nfl',
          'formula-1',
          'mma'
        ])
        .optional()
        .describe('Sport to query. Defaults to the configured sport.'),
      teamId: z.number().optional().describe('Get a specific team by ID'),
      name: z.string().optional().describe('Exact team name to search for'),
      league: z.number().optional().describe('League ID to filter teams by'),
      season: z.number().optional().describe('Season year'),
      country: z.string().optional().describe('Country name to filter teams by'),
      search: z.string().optional().describe('Search term (minimum 3 characters)')
    })
  )
  .output(
    z.object({
      teams: z.array(teamSchema),
      count: z.number().describe('Total number of teams returned')
    })
  )
  .handleInvocation(async ctx => {
    let sport = ctx.input.sport ?? ctx.config.sport;
    let client = new Client({ token: ctx.auth.token, sport });

    let data = await client.getTeams({
      teamId: ctx.input.teamId,
      name: ctx.input.name,
      league: ctx.input.league,
      season: ctx.input.season,
      country: ctx.input.country,
      search: ctx.input.search
    });

    let results = (data.response ?? []).map((item: any) => {
      let team = item.team ?? item;
      let venue = item.venue ?? {};
      return {
        teamId: team.id,
        name: team.name,
        code: team.code ?? null,
        country: team.country ?? null,
        founded: team.founded ?? null,
        national: team.national ?? null,
        logo: team.logo ?? null,
        venueName: venue.name ?? null,
        venueCity: venue.city ?? null,
        venueCapacity: venue.capacity ?? null,
        venueImage: venue.image ?? null
      };
    });

    return {
      output: {
        teams: results,
        count: results.length
      },
      message: `Found **${results.length}** team(s) for **${sport}**${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
