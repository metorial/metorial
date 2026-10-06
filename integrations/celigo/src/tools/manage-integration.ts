import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  integrationId: z.string().optional().describe('ID of the affected integration'),
  name: z.string().optional().describe('Name of the integration'),
  deleted: z.boolean().optional().describe('Whether the integration was deleted'),
  rawResult: z.any().optional().describe('Credential-filtered native API response')
});

export let manageIntegration = SlateTool.create(spec, {
  name: 'Manage Integration',
  key: 'manage_integration',
  description: `Get, create, update, clone, or delete an integration. Integrations are organizational containers for flows, connections, and other resources.
Use **action** to specify the operation. For "create" and "update", provide the integration configuration in **integrationData**.`
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
        .enum(['get', 'create', 'update', 'clone', 'delete'])
        .describe('The operation to perform'),
      integrationId: z
        .string()
        .optional()
        .describe('ID of the integration (required for get, update, clone, delete)'),
      integrationData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Integration configuration data (required for create and update)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('manage_integration', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();
