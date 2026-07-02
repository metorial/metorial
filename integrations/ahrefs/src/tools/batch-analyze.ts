import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let batchAnalyze = SlateTool.create(spec, {
  name: 'Batch Analyze',
  key: 'batch_analyze',
  description: `Analyze SEO metrics for multiple domains or URLs in a single request. Returns metrics such as Domain Rating, backlinks, referring domains, organic traffic, and keywords for up to 100 targets at once.
Use for bulk competitor analysis, portfolio monitoring, or comparing multiple domains efficiently.`,
  constraints: [
    'Maximum of 100 targets per request.',
    'Consumes API units.',
    'Rate limited to 60 requests per minute.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      targets: z.array(z.string()).describe('List of domains or URLs to analyze (up to 100)'),
      date: z
        .string()
        .optional()
        .describe('Date for the snapshot in YYYY-MM-DD format. Defaults to today.'),
      select: z.string().optional().describe('Comma-separated list of metrics to return')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Batch analysis results with SEO metrics for each target')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.batchAnalysis({
      targets: ctx.input.targets,
      date: ctx.input.date,
      select: ctx.input.select
    });

    return {
      output: {
        results: result
      },
      message: `Analyzed **${ctx.input.targets.length}** targets in batch.`
    };
  })
  .build();
