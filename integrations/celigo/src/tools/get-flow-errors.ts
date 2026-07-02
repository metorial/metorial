import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFlowErrors = SlateTool.create(spec, {
  name: 'Get Flow Errors',
  key: 'get_flow_errors',
  description: `Retrieve open errors for a specific export or import within a flow. Returns up to 1,000 errors per call. Use **nextPageUrl** from the response to paginate through additional errors.`,
  instructions: [
    'The processorId should be the _exportId or _importId of the flow step.',
    'Use occurredAtFrom/occurredAtTo to filter errors by time range (ISO 8601 UTC format).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      flowId: z.string().describe('ID of the flow'),
      processorId: z.string().describe('ID of the export or import step within the flow'),
      occurredAtFrom: z
        .string()
        .optional()
        .describe('Filter errors occurring on or after this time (ISO 8601 UTC)'),
      occurredAtTo: z
        .string()
        .optional()
        .describe('Filter errors occurring on or before this time (ISO 8601 UTC)')
    })
  )
  .output(
    z.object({
      errors: z.array(z.any()).describe('List of error objects'),
      retryData: z.any().optional().describe('Retry data dictionary keyed by retryDataKey'),
      nextPageUrl: z
        .string()
        .optional()
        .describe('URL for the next page of results, if more errors exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let params: Record<string, string> = {};
    if (ctx.input.occurredAtFrom) params.occurredAt_gte = ctx.input.occurredAtFrom;
    if (ctx.input.occurredAtTo) params.occurredAt_lte = ctx.input.occurredAtTo;

    let result = await client.getFlowErrors(ctx.input.flowId, ctx.input.processorId, params);

    let errors = result.errors || [];
    let retryData = result.retryData;
    let nextPageUrl = result.nextPageURL;

    return {
      output: {
        errors,
        retryData,
        nextPageUrl
      },
      message: `Retrieved **${errors.length}** error(s) for flow **${ctx.input.flowId}** / processor **${ctx.input.processorId}**.${nextPageUrl ? ' More results available via pagination.' : ''}`
    };
  })
  .build();
