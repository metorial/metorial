import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  connectionId: z.string().describe('ID of the updated connection'),
  name: z.string().optional().describe('Name of the updated connection'),
  type: z.string().optional().describe('Type of the updated connection'),
  rawConnection: z.any().describe('Credential-filtered native updated connection object')
});

export let updateConnection = SlateTool.create(spec, {
  name: 'Update Connection',
  key: 'update_connection',
  description: `Update an existing connection in Celigo. Replaces the connection configuration with the provided data.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      replaceAll: z
        .boolean()
        .optional()
        .describe(
          'Required true for full-replace updates. Provide the complete writable configuration; omitted settings may be cleared.'
        ),
      connectionId: z.string().describe('ID of the connection to update'),
      connectionData: z
        .record(z.string(), z.any())
        .describe('Updated connection configuration object')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('update_connection', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();
