import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let bulkUpdatePasses = SlateTool.create(spec, {
  name: 'Bulk Update Passes',
  key: 'bulk_update_passes',
  description: `Update multiple passes at once by specifying a filter (pass IDs, segment, or query) and the field values to apply. Uses partial update (PATCH) by default so only the provided fields are changed. Returns a process ID for tracking the async operation.`,
  instructions: [
    'Provide at least one filter: identifiers, segmentId, or query.',
    'The query supports the full Passcreator query language with operators like equals, contains, greaterThan, etc.',
    'Set fullReplace to true to fully replace pass data instead of patching (omitted fields will be deleted).'
  ],
  constraints: [
    'This operation is processed asynchronously; use the returned processUrl to check status.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      updates: z
        .record(z.string(), z.any())
        .describe('Field values to apply to all matching passes'),
      identifiers: z
        .array(z.string())
        .optional()
        .describe('Specific pass identifiers to update'),
      segmentId: z.string().optional().describe('Segment ID to target'),
      query: z
        .object({
          templateId: z.string().optional().describe('Template ID filter'),
          projectId: z.string().optional().describe('Project ID filter'),
          searchPhrase: z.string().optional().describe('Wildcard search'),
          groups: z
            .array(
              z.array(
                z.object({
                  field: z.string().describe('Field name'),
                  operator: z.string().describe('Filter operator'),
                  value: z.any().describe('Value(s) to match')
                })
              )
            )
            .optional()
            .describe('Filter condition groups')
        })
        .optional()
        .describe('Query language filter'),
      fullReplace: z
        .boolean()
        .optional()
        .default(false)
        .describe('Use full replace (POST) instead of partial update (PATCH)')
    })
  )
  .output(
    z.object({
      processUrl: z
        .string()
        .optional()
        .describe('URL to check the status of the async bulk operation'),
      count: z.number().optional().describe('Number of passes queued for update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let filter: Record<string, any> = {};
    if (ctx.input.identifiers) filter.identifiers = ctx.input.identifiers;
    if (ctx.input.segmentId) filter.segmentId = ctx.input.segmentId;
    if (ctx.input.query) filter.query = ctx.input.query;

    let method: 'POST' | 'PATCH' = ctx.input.fullReplace ? 'POST' : 'PATCH';

    let result = await client.bulkUpdatePasses(method, {
      data: ctx.input.updates,
      filter
    });

    let processUrl = result.data?.process;
    let count = result.count;

    return {
      output: { processUrl, count },
      message: `Queued bulk update for **${count ?? 'unknown'}** pass(es).${processUrl ? ` Track progress at: ${processUrl}` : ''}`
    };
  })
  .build();
