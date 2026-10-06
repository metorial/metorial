import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  flowId: z.string().describe('Unique flow identifier'),
  name: z.string().optional().describe('Flow name'),
  disabled: z.boolean().optional().describe('Whether the flow is disabled'),
  integrationId: z.string().optional().describe('Parent integration ID'),
  lastModified: z.string().optional().describe('Last modification timestamp'),
  scheduleDetails: z.any().optional(),
  schedule: z.string().optional().describe('Cron schedule expression'),
  pageGenerators: z.array(z.any()).optional().describe('Export components of the flow'),
  pageProcessors: z.array(z.any()).optional().describe('Import/lookup components of the flow'),
  dependencies: z.any().optional().describe('Flow dependencies, if requested'),
  rawFlow: z.any().describe('Credential-filtered native flow object')
});

export let getFlow = SlateTool.create(spec, {
  name: 'Get Flow',
  key: 'get_flow',
  description: `Retrieve details of a specific flow, including its page generators (exports), page processors (imports/lookups), schedule, and dependencies.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      flowId: z.string().describe('ID of the flow to retrieve'),
      includeDependencies: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, also fetch the flow dependencies')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('get_flow', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();
