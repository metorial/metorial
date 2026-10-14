import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { getPointagramList, PointagramClient } from '../lib/client';
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

    let competitions = getPointagramList(compResult, 'competitions');

    let competitionPlayers: unknown[] | undefined;
    if (ctx.input.includePlayers) {
      competitionPlayers = [];
      let competitionIds = competitions.map(competition => {
        let id = isApiErrorRecord(competition) ? competition.id : undefined;
        if (typeof id !== 'string' && typeof id !== 'number') {
          throw createApiServiceError(
            'Pointagram did not return an ID for a selected competition. Cannot retrieve its participants.'
          );
        }
        return String(id);
      });
      for (let competitionId of new Set(competitionIds)) {
        let playersResult = await client.listCompetitionPlayers(competitionId);
        competitionPlayers.push(...getPointagramList(playersResult, 'players'));
      }
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
