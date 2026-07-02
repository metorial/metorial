import { SlateTool } from 'slates';
import { z } from 'zod';
import { StitchConnectClient } from '../lib/client';
import { spec } from '../spec';

export let deleteSource = SlateTool.create(spec, {
  name: 'Delete Source',
  key: 'delete_source',
  description: `Permanently deletes a data source (integration) from the Stitch account. This stops all data replication for the source and removes its configuration.`,
  constraints: [
    'This action is irreversible. The source and all its configuration will be permanently removed.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sourceId: z.number().describe('ID of the source to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    await client.deleteSource(ctx.input.sourceId);

    return {
      output: { success: true },
      message: `Deleted source with ID **${ctx.input.sourceId}**.`
    };
  })
  .build();
