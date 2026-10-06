import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  deleted: z.boolean().describe('Whether the connection was successfully deleted'),
  connectionId: z.string().describe('ID of the deleted connection')
});

export let deleteConnection = SlateTool.create(spec, {
  name: 'Delete Connection',
  key: 'delete_connection',
  description: `Permanently delete a connection from your Celigo account. This cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('ID of the connection to delete')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('delete_connection', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();
