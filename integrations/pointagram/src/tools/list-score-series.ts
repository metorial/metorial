import { SlateTool } from 'slates';
import { z } from 'zod';
import { PointagramClient } from '../lib/client';
import { spec } from '../spec';

export let listScoreSeries = SlateTool.create(spec, {
  name: 'List Score Series',
  key: 'list_score_series',
  description: `Retrieves all score series in your Pointagram account. Optionally fetches the point types configured for a specific score series.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      scoreseriesId: z
        .string()
        .optional()
        .describe('If provided, also fetches the point types configured for this score series')
    })
  )
  .output(
    z.object({
      scoreSeries: z.array(z.any()).describe('List of score series'),
      pointTypes: z
        .array(z.any())
        .optional()
        .describe(
          'Point types for the specified score series (only if scoreseriesId was provided)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new PointagramClient({
      token: ctx.auth.token,
      apiUser: ctx.auth.apiUser
    });

    let seriesResult = await client.listScoreSeries();
    let scoreSeries = Array.isArray(seriesResult)
      ? seriesResult
      : (seriesResult?.scoreseries ?? [seriesResult]);

    let pointTypes: unknown[] | undefined;
    if (ctx.input.scoreseriesId) {
      let ptResult = await client.listScoreSeriesPointTypes(ctx.input.scoreseriesId);
      pointTypes = Array.isArray(ptResult) ? ptResult : (ptResult?.pointtypes ?? [ptResult]);
    }

    let message = `Found **${scoreSeries.length}** score series.`;
    if (pointTypes) {
      message += ` Retrieved **${pointTypes.length}** point type(s) for series \`${ctx.input.scoreseriesId}\`.`;
    }

    return {
      output: { scoreSeries, pointTypes },
      message
    };
  })
  .build();
