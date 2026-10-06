import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  nextPageUrl: z.string().optional().describe('Next native page, when present.'),
  flows: z
    .array(
      z.object({
        flowId: z.string().describe('Unique flow identifier'),
        name: z.string().optional().describe('Flow name'),
        disabled: z.boolean().optional().describe('Whether the flow is disabled'),
        integrationId: z.string().optional().describe('Parent integration ID'),
        lastModified: z.string().optional().describe('Last modification timestamp'),
        scheduleDetails: z.any().optional(),
        schedule: z.string().optional().describe('Cron schedule expression, if scheduled')
      })
    )
    .describe('List of flows')
});

export let listFlows = SlateTool.create(spec, {
  name: 'List Flows',
  key: 'list_flows',
  description: `Retrieve one native page of integration flows in your Celigo account. Flows compose exports and imports to move data between applications.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum records on this native page.'),
      externalId: z.string().optional().describe('Exact native externalId filter.'),
      nextPageUrl: z
        .string()
        .optional()
        .describe('Next URL from the preceding page, with the same filters and limit.')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('list_flows', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();
