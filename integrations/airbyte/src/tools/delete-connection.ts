import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteConnectionTool = SlateTool.create(spec, {
  name: 'Delete Connection',
  key: 'delete_connection',
  description: `Permanently delete an Airbyte connection. This removes the link between a source and destination. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('The UUID of the connection to delete.')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteConnection(ctx.input.connectionId);

    return {
      output: { success: true },
      message: `Deleted connection ${ctx.input.connectionId}.`
    };
  })
  .build();
