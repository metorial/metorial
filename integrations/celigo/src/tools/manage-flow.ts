import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  partialFailure: z
    .boolean()
    .optional()
    .describe(
      'Some run entries failed while returned job IDs were queued; reconcile before repeating.'
    ),
  jobId: z.string().optional(),
  jobIds: z.array(z.string()).optional(),
  queued: z.boolean().optional(),
  flowId: z.string().optional().describe('ID of the affected flow'),
  name: z.string().optional().describe('Name of the flow'),
  disabled: z.boolean().optional().describe('Whether the flow is disabled'),
  deleted: z.boolean().optional().describe('Whether the flow was deleted'),
  rawResult: z.any().optional().describe('Credential-filtered native API response')
});

export let manageFlow = SlateTool.create(spec, {
  name: 'Manage Flow',
  key: 'manage_flow',
  description: `Create, update, enable, disable, run, clone, or delete a flow. Use the **action** field to specify the operation.
For "create" and "update", provide the flow configuration in **flowData**. For "enable", "disable", "run", "clone", and "delete", only the **flowId** is needed.`,
  instructions: [
    'Running a flow via API places it in the invocation queue — it does not guarantee immediate execution.',
    'Cloning creates a resource manifest and can share connections. Provide cloneOptions._integrationId and connectionMap; copied dependencies and past external effects require separate reconciliation.'
  ]
})
  .input(
    z.object({
      replaceAll: z
        .boolean()
        .optional()
        .describe(
          'Required true for full-replace updates. Provide the complete writable configuration; omitted settings may be cleared.'
        ),
      cloneOptions: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Documented clone request; flow clones require _integrationId and connectionMap. Integration clones require connectionMap.'
        ),
      action: z
        .enum(['create', 'update', 'enable', 'disable', 'run', 'clone', 'delete'])
        .describe('The operation to perform on the flow'),
      flowId: z
        .string()
        .optional()
        .describe('ID of the flow (required for all actions except "create")'),
      flowData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Flow configuration data (required for "create" and "update")')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('manage_flow', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();
