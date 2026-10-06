import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  errors: z.array(z.any()).describe('List of error objects'),
  retryData: z.any().optional().describe('Retry data dictionary keyed by retryDataKey'),
  nextPageUrl: z
    .string()
    .optional()
    .describe('URL for the next page of results, if more errors exist')
});

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
      nextPageUrl: z
        .string()
        .optional()
        .describe('Native next URL from this same flow and processor with unchanged filters.'),
      flowJobId: z
        .string()
        .optional()
        .describe('Optional parent job ID belonging to this flow; requires occurredAtFrom.'),
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
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('get_flow_errors', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();
