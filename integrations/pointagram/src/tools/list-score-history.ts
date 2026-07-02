import { SlateTool } from 'slates';
import { z } from 'zod';
import { PointagramClient } from '../lib/client';
import { spec } from '../spec';

export let listScoreHistory = SlateTool.create(spec, {
  name: 'List Score History',
  key: 'list_score_history',
  description: `Retrieves the score transaction history for a specific score series. Supports filtering by tags, teams, players, and time range. Supports pagination using offset parameters.`,
  instructions: [
    'The `tagsFilter` parameter accepts a JSON string, e.g. `[{"id":"13","type":1}]` where type 1 = tag and type 2 = point type.',
    'For pagination, use `offsetTimestamp` and `offsetId` from the last row of the previous page.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      scoreseriesId: z.string().describe('ID of the score series to query history for'),
      tagsFilter: z
        .string()
        .optional()
        .describe('JSON string filter for tags/point types, e.g. [{"id":"13","type":1}]'),
      teamsFilter: z.string().optional().describe('Filter by team'),
      playerFilter: z.string().optional().describe('Filter by player'),
      timeFrom: z.string().optional().describe('UTC timestamp to fetch history from'),
      offsetTimestamp: z
        .string()
        .optional()
        .describe('Pagination: timestamp of the last fetched row'),
      offsetId: z.string().optional().describe('Pagination: ID of the last fetched row')
    })
  )
  .output(
    z.object({
      history: z.array(z.any()).describe('List of score history entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PointagramClient({
      token: ctx.auth.token,
      apiUser: ctx.auth.apiUser
    });

    let result = await client.listScoreSeriesHistory({
      scoreseriesId: ctx.input.scoreseriesId,
      tagsFilter: ctx.input.tagsFilter,
      teamsFilter: ctx.input.teamsFilter,
      playerFilter: ctx.input.playerFilter,
      timeFrom: ctx.input.timeFrom,
      offsetTimestamp: ctx.input.offsetTimestamp,
      offsetId: ctx.input.offsetId
    });

    let history = Array.isArray(result) ? result : (result?.history ?? [result]);

    return {
      output: { history },
      message: `Retrieved **${history.length}** score history entries for series \`${ctx.input.scoreseriesId}\`.`
    };
  })
  .build();
