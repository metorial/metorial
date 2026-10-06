import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  keys: z.array(z.string()).optional().describe('List of state keys (for list_keys action)'),
  stateValue: z.any().optional().describe('The state value (for get action)'),
  updated: z.boolean().optional().describe('Whether the state was updated (for set action)'),
  deleted: z.boolean().optional().describe('Whether the state was deleted (for delete action)')
});

export let manageState = SlateTool.create(spec, {
  name: 'Manage State',
  key: 'manage_state',
  description: `Read, write, or delete state data in Celigo. State is an API-only resource that stores arbitrary JSON data associated with a custom key.
Supports both **global** state (account-level) and **resource-specific** state (scoped to exports, imports, or integrations). Commonly used to persist flow execution data between runs.`,
  instructions: [
    'For global state, omit resourceType and resourceId.',
    'For resource-specific state, provide both resourceType (e.g., "exports", "imports", "integrations") and resourceId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list_keys', 'get', 'set', 'delete'])
        .describe('The operation to perform'),
      key: z.string().optional().describe('State key (required for get, set, delete)'),
      stateValue: z
        .record(z.string(), z.any())
        .optional()
        .describe('JSON data to store (required for set)'),
      resourceType: z
        .string()
        .optional()
        .describe(
          'Resource type for resource-specific state (e.g., "exports", "imports", "integrations"). Omit for global state.'
        ),
      resourceId: z
        .string()
        .optional()
        .describe('Resource ID for resource-specific state. Omit for global state.')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('manage_state', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();
