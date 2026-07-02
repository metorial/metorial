import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let leagueSchema = z.object({
  leagueId: z.number().describe('Unique league ID'),
  name: z.string().describe('League name'),
  type: z.string().describe('League type (e.g., League, Cup)'),
  logo: z.string().nullable().describe('URL of the league logo'),
  country: z.string().nullable().describe('Country name'),
  countryCode: z.string().nullable().describe('Country code'),
  countryFlag: z.string().nullable().describe('URL of the country flag'),
  seasons: z
    .array(
      z.object({
        year: z.number().describe('Season year'),
        start: z.string().nullable().describe('Season start date'),
        end: z.string().nullable().describe('Season end date'),
        current: z.boolean().describe('Whether this is the current season')
      })
    )
    .describe('Available seasons')
});

export let searchLeaguesTool = SlateTool.create(spec, {
  name: 'Search Leagues',
  key: 'search_leagues',
  description: `Search for leagues and competitions available in API-Sports. Filter by country, season, name, or type. Returns league details including available seasons and coverage information. Use this to discover league IDs needed by other tools.`,
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
      leagueId: z.number().optional().describe('Get a specific league by ID'),
      name: z.string().optional().describe('Exact league name to search for'),
      country: z.string().optional().describe('Country name to filter leagues by'),
      season: z.number().optional().describe('Season year to filter by'),
      type: z.string().optional().describe('League type filter (e.g., "league" or "cup")'),
      current: z
        .boolean()
        .optional()
        .describe('Only return leagues with a currently active season'),
      search: z.string().optional().describe('Search term (minimum 3 characters)')
    })
  )
  .output(
    z.object({
      leagues: z.array(leagueSchema),
      count: z.number().describe('Total number of leagues returned')
    })
  )
  .handleInvocation(async ctx => {
    let sport = ctx.input.sport ?? ctx.config.sport;
    let client = new Client({ token: ctx.auth.token, sport });

    let data = await client.getLeagues({
      leagueId: ctx.input.leagueId,
      name: ctx.input.name,
      country: ctx.input.country,
      season: ctx.input.season,
      type: ctx.input.type,
      current: ctx.input.current,
      search: ctx.input.search
    });

    let results = (data.response ?? []).map((item: any) => ({
      leagueId: item.league?.id ?? item.id,
      name: item.league?.name ?? item.name,
      type: item.league?.type ?? item.type ?? 'unknown',
      logo: item.league?.logo ?? item.logo ?? null,
      country: item.country?.name ?? null,
      countryCode: item.country?.code ?? null,
      countryFlag: item.country?.flag ?? null,
      seasons: (item.seasons ?? []).map((s: any) => ({
        year: s.year,
        start: s.start ?? null,
        end: s.end ?? null,
        current: s.current ?? false
      }))
    }));

    return {
      output: {
        leagues: results,
        count: results.length
      },
      message: `Found **${results.length}** league(s) for **${sport}**${ctx.input.country ? ` in ${ctx.input.country}` : ''}${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
