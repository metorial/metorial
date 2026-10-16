import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let playerStatSchema = z.object({
  playerId: z.number().nullable().describe('Player ID'),
  playerName: z.string().nullable().describe('Player full name'),
  firstName: z.string().nullable().describe('First name'),
  lastName: z.string().nullable().describe('Last name'),
  age: z.number().nullable().describe('Player age'),
  nationality: z.string().nullable().describe('Nationality'),
  height: z.string().nullable().describe('Height'),
  weight: z.string().nullable().describe('Weight'),
  photo: z.string().nullable().describe('Player photo URL'),
  injured: z.boolean().nullable().describe('Whether the player is currently injured'),
  seasonStats: z
    .array(
      z.object({
        leagueName: z.string().nullable().describe('League name'),
        leagueId: z.number().nullable().describe('League ID'),
        teamName: z.string().nullable().describe('Team name'),
        teamId: z.number().nullable().describe('Team ID'),
        appearances: z.number().nullable().describe('Number of appearances'),
        minutes: z.number().nullable().describe('Total minutes played'),
        goals: z.number().nullable().describe('Goals scored'),
        assists: z.number().nullable().describe('Assists'),
        yellowCards: z.number().nullable().describe('Yellow cards'),
        redCards: z.number().nullable().describe('Red cards'),
        rating: z.string().nullable().describe('Average rating'),
        position: z.string().nullable().describe('Position played')
      })
    )
    .describe('Statistics per league/competition')
});

export let getPlayerStatsTool = SlateTool.create(spec, {
  name: 'Get Player Statistics',
  key: 'get_player_stats',
  description: `Retrieve football player profiles and season statistics, or player profiles for Basketball, NBA, NFL, Formula 1 drivers and MMA fighters. NBA game statistics are available through get_nba_player_statistics. Other sports do not expose player directories. Search players by name, or filter by team, league, and season. Returns player biographical data and per-league performance stats including goals, assists, appearances, cards, and ratings.`,
  instructions: [
    'When searching by name, provide at least 3 characters.',
    'For season stats, provide a season year along with a league or team filter.'
  ],
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
      seasonName: z
        .string()
        .optional()
        .describe('Exact string basketball season from get_seasons; use instead of season'),
      playerId: z.number().optional().describe('Get a specific player by ID'),
      team: z.number().optional().describe('Filter by team ID'),
      league: z.number().optional().describe('Filter by league ID'),
      season: z.number().optional().describe('Season year for statistics'),
      search: z.string().optional().describe('Search by player name (min 3 characters)'),
      page: z.number().optional().describe('Page number for paginated results')
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .optional()
        .describe('Complete provider response, including coverage and pagination metadata'),
      players: z.array(playerStatSchema),
      count: z.number().describe('Number of players returned'),
      totalPages: z.number().nullable().describe('Total number of pages available'),
      currentPage: z.number().nullable().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let sport = ctx.input.sport ?? ctx.config.sport;
    let client = new Client({ token: ctx.auth.token, sport });

    let data = await client.getPlayers({
      playerId: ctx.input.playerId,
      team: ctx.input.team,
      league: ctx.input.league,
      season: ctx.input.seasonName ?? ctx.input.season,
      search: ctx.input.search,
      page: ctx.input.page
    });

    let results = (data.response ?? []).map((item: any) => {
      let player = item.player ?? item;
      let stats = Array.isArray(item.statistics) ? item.statistics : [];
      return {
        playerId: player.id ?? null,
        playerName:
          player.name ??
          ([player.firstname, player.lastname].filter(Boolean).join(' ') || null),
        firstName: player.firstname ?? null,
        lastName: player.lastname ?? null,
        age: player.age ?? null,
        nationality:
          player.nationality ??
          player.birth?.country ??
          (typeof player.country === 'string' ? player.country : null),
        height:
          typeof player.height === 'string'
            ? player.height
            : player.height?.meters != null
              ? `${player.height.meters} m`
              : null,
        weight:
          typeof player.weight === 'string'
            ? player.weight
            : player.weight?.kilograms != null
              ? `${player.weight.kilograms} kg`
              : null,
        photo: player.photo ?? player.image ?? null,
        injured: player.injured ?? null,
        seasonStats: stats.map((s: any) => ({
          leagueName: s.league?.name ?? null,
          leagueId: s.league?.id ?? null,
          teamName: s.team?.name ?? null,
          teamId: s.team?.id ?? null,
          appearances: s.games?.appearences ?? null,
          minutes: s.games?.minutes ?? null,
          goals: s.goals?.total ?? null,
          assists: s.goals?.assists ?? null,
          yellowCards: s.cards?.yellow ?? null,
          redCards: s.cards?.red ?? null,
          rating: s.games?.rating ?? null,
          position: s.games?.position ?? null
        }))
      };
    });

    let paging = data.paging ?? {};

    return {
      output: {
        raw: data,
        players: results,
        count: results.length,
        totalPages: paging.total ?? null,
        currentPage: paging.current ?? null
      },
      message: `Found **${results.length}** player(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
