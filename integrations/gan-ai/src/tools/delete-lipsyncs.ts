import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaygroundClient } from '../lib/client';
import { spec } from '../spec';

export let deleteLipsyncs = SlateTool.create(spec, {
  name: 'Delete Lip-Sync Videos',
  key: 'delete_lipsyncs',
  description: `Bulk delete lip-sync video inferences by their inference IDs.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      inferenceIds: z.array(z.string()).describe('List of lip-sync inference IDs to delete')
    })
  )
  .output(
    z.object({
      deletedCount: z.number().describe('Number of inferences successfully deleted'),
      failedCount: z.number().describe('Number of deletions that failed'),
      deletedIds: z.array(z.string()).describe('IDs that were successfully deleted'),
      failedIds: z.array(z.string()).describe('IDs that failed to delete')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaygroundClient(ctx.auth.token);
    let result = await client.deleteLipsyncs(ctx.input.inferenceIds);

    return {
      output: {
        deletedCount: result.deleted_count,
        failedCount: result.failed_count,
        deletedIds: result.deleted_ids,
        failedIds: result.failed_ids
      },
      message: `Deleted **${result.deleted_count}** lip-sync inferences${result.failed_count > 0 ? `, **${result.failed_count}** failed` : ''}.`
    };
  })
  .build();
