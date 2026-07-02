import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getKeywordMetrics = SlateTool.create(spec, {
  name: 'Get Keyword Metrics',
  key: 'get_keyword_metrics',
  description: `Retrieve keyword movement metrics for a project, showing how many keywords moved up, down, or stayed the same across various timeframes. Useful for understanding overall ranking trends and share of voice at a project level.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectName: z.string().describe('Name of the project to get metrics for'),
      tagId: z.string().optional().describe('Filter metrics by a specific tag ID'),
      timeframe: z
        .enum(['daily', 'weekly', 'monthly', 'semester', 'yearly', 'life'])
        .optional()
        .describe('Timeframe for metric comparison')
    })
  )
  .output(
    z.object({
      metrics: z.any().describe('Keyword movement metrics with up/down/tie counts and ranges')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getKeywordMetrics({
      projectName: ctx.input.projectName,
      tagId: ctx.input.tagId,
      timeframe: ctx.input.timeframe
    });

    return {
      output: {
        metrics: data
      },
      message: `Retrieved keyword metrics for project **${ctx.input.projectName}**${ctx.input.timeframe ? ` (${ctx.input.timeframe})` : ''}.`
    };
  })
  .build();
