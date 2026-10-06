import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  exportId: z.string().optional().describe('ID of the affected export'),
  name: z.string().optional().describe('Name of the export'),
  type: z.string().optional().describe('Type of the export'),
  deleted: z.boolean().optional().describe('Whether the export was deleted'),
  rawResult: z.any().optional().describe('Credential-filtered native API response')
});

export let manageExport = SlateTool.create(spec, {
  name: 'Manage Export',
  key: 'manage_export',
  description: `Get, create, update, clone, or delete an export. Exports extract data from an application and can run standalone via the API or in the context of a flow.
Use **action** to specify the operation. For "create" and "update", provide the export configuration in **exportData**.`,
  instructions: [
    'The export data structure varies by type and connected application. Refer to the Celigo API docs for type-specific fields.'
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
        .enum(['get', 'create', 'update', 'clone', 'delete'])
        .describe('The operation to perform'),
      exportId: z
        .string()
        .optional()
        .describe('ID of the export (required for get, update, clone, delete)'),
      exportData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Export configuration data (required for create and update)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('manage_export', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();
