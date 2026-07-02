import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

export let queryInsights = SlateTool.create(spec, {
  name: 'Query Insights Report',
  key: 'query_insights',
  description: `Query a saved Insights report in Mixpanel by its bookmark ID. Returns the computed report data as shown in the Mixpanel web app.`,
  constraints: ['Rate limit: 60 queries per hour, max 5 concurrent queries.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bookmarkId: z.number().describe('Bookmark ID of the saved Insights report')
    })
  )
  .output(
    z.object({
      reportData: z
        .record(z.string(), z.unknown())
        .describe('Report data from the saved Insights report')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let data = await client.queryInsights(ctx.input.bookmarkId);

    return {
      output: { reportData: data },
      message: `Retrieved Insights report data for bookmark **${ctx.input.bookmarkId}**.`
    };
  })
  .build();
