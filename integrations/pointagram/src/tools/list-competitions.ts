import { SlateTool } from 'slates';
import { z } from 'zod';
import { PointagramClient } from '../lib/client';
import { spec } from '../spec';

export let listCompetitions = SlateTool.create(spec, {
  name: 'List Competitions',
  key: 'list_competitions',
  description: `Retrieves competitions from Pointagram. Can optionally filter by player or competition ID. Also supports fetching competition participants.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      competitionId: z.string().optional().describe('Filter by specific competition ID'),
      accessKey: z.string().optional().describe('Competition access key'),
      playerEmail: z.string().optional().describe('Filter competitions by player email'),
      playerName: z.string().optional().describe('Filter competitions by player name'),
      playerExternalId: z
        .string()
        .optional()
        .describe('Filter competitions by player external ID'),
      includePlayers: z
        .boolean()
        .optional()
        .describe('If true, also fetches the participating players for each competition')
    })
  )
  .output(
    z.object({
      competitions: z.array(z.any()).describe('List of competitions'),
      competitionPlayers: z
        .array(z.any())
        .optional()
        .describe('Players participating in the competitions (if includePlayers is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PointagramClient({
      token: ctx.auth.token,
      apiUser: ctx.auth.apiUser
    });

    let compResult = await client.listCompetitions({
      competitionId: ctx.input.competitionId,
      accessKey: ctx.input.accessKey,
      playerEmail: ctx.input.playerEmail,
      playerName: ctx.input.playerName,
      playerExternalId: ctx.input.playerExternalId
    });

    let competitions = Array.isArray(compResult)
      ? compResult
      : (compResult?.competitions ?? [compResult]);

    let competitionPlayers: unknown[] | undefined;
    if (ctx.input.includePlayers) {
      let playersResult = await client.listCompetitionPlayers({
        competitionId: ctx.input.competitionId,
        playerEmail: ctx.input.playerEmail,
        playerName: ctx.input.playerName,
        playerExternalId: ctx.input.playerExternalId
      });
      competitionPlayers = Array.isArray(playersResult)
        ? playersResult
        : (playersResult?.players ?? [playersResult]);
    }

    let message = `Found **${competitions.length}** competition(s).`;
    if (competitionPlayers) {
      message += ` Retrieved **${competitionPlayers.length}** participant(s).`;
    }

    return {
      output: { competitions, competitionPlayers },
      message
    };
  })
  .build();
