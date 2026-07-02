import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let injurySchema = z.object({
  playerId: z.number().nullable().describe('Player ID'),
  playerName: z.string().nullable().describe('Player name'),
  playerPhoto: z.string().nullable().describe('Player photo URL'),
  type: z.string().nullable().describe('Injury type (e.g., Muscle Injury, Knee Injury)'),
  reason: z.string().nullable().describe('Injury reason or description'),
  teamId: z.number().nullable().describe('Team ID'),
  teamName: z.string().nullable().describe('Team name'),
  teamLogo: z.string().nullable().describe('Team logo URL'),
  leagueName: z.string().nullable().describe('League name'),
  fixtureId: z.number().nullable().describe('Related fixture ID'),
  fixtureDate: z.string().nullable().describe('Fixture date')
});

export let getInjuriesTool = SlateTool.create(spec, {
  name: 'Get Injuries',
  key: 'get_injuries',
  description: `Retrieve player injury and suspension data for football. Filter by league, season, fixture, team, or specific player. Returns injury type, reason, and affected fixture information.`,
  instructions: [
    'Injury data availability varies by league. Use the Search Leagues tool to check coverage.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      league: z.number().optional().describe('League ID to filter by'),
      season: z.number().optional().describe('Season year'),
      fixture: z.number().optional().describe('Fixture ID to get injuries for'),
      team: z.number().optional().describe('Team ID to filter by'),
      player: z.number().optional().describe('Player ID to filter by'),
      date: z.string().optional().describe('Date filter (YYYY-MM-DD)'),
      timezone: z.string().optional().describe('Timezone for dates')
    })
  )
  .output(
    z.object({
      injuries: z.array(injurySchema),
      count: z.number().describe('Number of injuries returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, sport: 'football' });

    let data = await client.getInjuries({
      league: ctx.input.league,
      season: ctx.input.season,
      fixture: ctx.input.fixture,
      team: ctx.input.team,
      player: ctx.input.player,
      date: ctx.input.date,
      timezone: ctx.input.timezone
    });

    let results = (data.response ?? []).map((item: any) => ({
      playerId: item.player?.id ?? null,
      playerName: item.player?.name ?? null,
      playerPhoto: item.player?.photo ?? null,
      type: item.player?.type ?? null,
      reason: item.player?.reason ?? null,
      teamId: item.team?.id ?? null,
      teamName: item.team?.name ?? null,
      teamLogo: item.team?.logo ?? null,
      leagueName: item.league?.name ?? null,
      fixtureId: item.fixture?.id ?? null,
      fixtureDate: item.fixture?.date ?? null
    }));

    return {
      output: {
        injuries: results,
        count: results.length
      },
      message: `Found **${results.length}** injury/suspension record(s).`
    };
  })
  .build();
