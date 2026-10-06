import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  importId: z.string().optional().describe('ID of the affected import'),
  name: z.string().optional().describe('Name of the import'),
  deleted: z.boolean().optional().describe('Whether the import was deleted'),
  rawResult: z.any().optional().describe('Credential-filtered native API response')
});

export let manageImport = SlateTool.create(spec, {
  name: 'Manage Import',
  key: 'manage_import',
  description: `Get, create, update, clone, or delete an import. Imports map and insert data into an application and can run standalone via the API or in the context of a flow.
Use **action** to specify the operation. For "create" and "update", provide the import configuration in **importData**.`,
  instructions: [
    'The import data structure varies by type and connected application. Refer to the Celigo API docs for type-specific fields.',
    'Common fields include: name, _connectionId, mapping, and application-specific settings.'
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
      importId: z
        .string()
        .optional()
        .describe('ID of the import (required for get, update, clone, delete)'),
      importData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Import configuration data (required for create and update)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('manage_import', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();
