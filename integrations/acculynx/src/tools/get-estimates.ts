import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEstimatesTool = SlateTool.create(spec, {
  name: 'Get Estimates',
  key: 'get_estimates',
  description: `Retrieve estimates from AccuLynx. Get all estimates for the location, estimates for a specific job, or details of a single estimate including its sections and line items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      estimateId: z
        .string()
        .optional()
        .describe('Specific estimate ID to retrieve details for'),
      jobId: z.string().optional().describe('Job ID to retrieve estimates for'),
      includeSections: z
        .boolean()
        .optional()
        .describe(
          'Include estimate sections and their items (only when estimateId is provided)'
        ),
      pageSize: z.number().optional().describe('Number of items per page (for listing)'),
      pageStartIndex: z
        .number()
        .optional()
        .describe('Index of the first element to return (for listing)')
    })
  )
  .output(
    z.object({
      estimate: z.record(z.string(), z.any()).optional().describe('Single estimate details'),
      estimates: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of estimate objects'),
      sections: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Estimate sections with items')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.estimateId) {
      let estimate = await client.getEstimate(ctx.input.estimateId);
      let sections: any[] | undefined;

      if (ctx.input.includeSections) {
        try {
          let sectionsResult = await client.getEstimateSections({ pageSize: 100 });
          sections = Array.isArray(sectionsResult)
            ? sectionsResult
            : (sectionsResult?.items ?? sectionsResult?.data ?? []);
        } catch (_e) {
          sections = [];
        }
      }

      return {
        output: { estimate, sections },
        message: `Retrieved estimate **${ctx.input.estimateId}**${sections ? ` with ${sections.length} section(s)` : ''}.`
      };
    }

    if (ctx.input.jobId) {
      let result = await client.getJobEstimates(ctx.input.jobId);
      let estimates = Array.isArray(result) ? result : (result?.items ?? result?.data ?? []);
      return {
        output: { estimates },
        message: `Retrieved **${estimates.length}** estimate(s) for job **${ctx.input.jobId}**.`
      };
    }

    let result = await client.getEstimates({
      pageSize: ctx.input.pageSize,
      pageStartIndex: ctx.input.pageStartIndex
    });
    let estimates = Array.isArray(result)
      ? result
      : (result?.items ?? result?.data ?? [result]);

    return {
      output: { estimates },
      message: `Retrieved **${estimates.length}** estimate(s).`
    };
  })
  .build();
