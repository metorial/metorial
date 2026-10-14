import { SlateTool } from 'slates';
import { z } from 'zod';
import { getPointagramList, PointagramClient } from '../lib/client';
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
      scoreseriesId: z
        .string()
        .describe('Score series ID. Call list_score_series to discover score series IDs.'),
      tagsFilter: z
        .string()
        .optional()
        .describe('JSON string filter for tags/point types, e.g. [{"id":"13","type":1}]'),
      tagsOrFilter: z
        .string()
        .optional()
        .describe('JSON string for an OR tag/point-type filter, using the tagsFilter format'),
      teamsFilter: z.string().optional().describe('JSON array of team IDs, e.g. ["20"]'),
      playerFilter: z.string().optional().describe('JSON array of player IDs, e.g. ["19145"]'),
      timeFrom: z
        .string()
        .optional()
        .describe('UTC lower time bound in YYYY-MM-DD HH:mm:ss format'),
      timeTo: z
        .string()
        .optional()
        .describe('UTC upper time bound in YYYY-MM-DD HH:mm:ss format'),
      showRevoked: z.boolean().optional().describe('Include revoked point transactions'),
      limit: z
        .number()
        .optional()
        .describe('Page size, a whole number from 1 to 1000. Defaults to 50.'),
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
      tagsOrFilter: ctx.input.tagsOrFilter,
      teamsFilter: ctx.input.teamsFilter,
      playerFilter: ctx.input.playerFilter,
      timeFrom: ctx.input.timeFrom,
      timeTo: ctx.input.timeTo,
      showRevoked: ctx.input.showRevoked,
      limit: ctx.input.limit,
      offsetTimestamp: ctx.input.offsetTimestamp,
      offsetId: ctx.input.offsetId
    });

    let history = getPointagramList(result, 'history');

    return {
      output: { history },
      message: `Retrieved **${history.length}** score history entries for series \`${ctx.input.scoreseriesId}\`.`
    };
  })
  .build();
