import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteSourceTool = SlateTool.create(spec, {
  name: 'Delete Source',
  key: 'delete_source',
  description: `Permanently delete an Airbyte source connector. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sourceId: z.string().describe('The UUID of the source to delete.')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteSource(ctx.input.sourceId);

    return {
      output: { success: true },
      message: `Deleted source ${ctx.input.sourceId}.`
    };
  })
  .build();
