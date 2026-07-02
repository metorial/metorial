import { SlateTool } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { spec } from '../spec';

export let deleteClient = SlateTool.create(spec, {
  name: 'Delete Client',
  key: 'delete_client',
  description: `Delete a client from Bidsketch. **Warning:** This also deletes all proposals associated with the client.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      clientId: z.number().describe('ID of the client to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);
    await client.deleteClient(ctx.input.clientId);

    return {
      output: { success: true },
      message: `Deleted client with ID **${ctx.input.clientId}** and all associated proposals.`
    };
  })
  .build();
