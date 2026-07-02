import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaygroundClient } from '../lib/client';
import { spec } from '../spec';

export let deleteAvatars = SlateTool.create(spec, {
  name: 'Delete Avatars',
  key: 'delete_avatars',
  description: `Bulk delete avatars and/or avatar video inferences. Deleting an avatar also deletes all associated video inferences. Provide avatar IDs, inference IDs, or both to delete.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      avatarIds: z.array(z.string()).optional().describe('List of avatar IDs to delete'),
      inferenceIds: z
        .array(z.string())
        .optional()
        .describe('List of avatar inference IDs to delete')
    })
  )
  .output(
    z.object({
      deletedAvatarsCount: z
        .number()
        .optional()
        .describe('Number of avatars successfully deleted'),
      failedAvatarsCount: z
        .number()
        .optional()
        .describe('Number of avatar deletions that failed'),
      associatedInferencesDeletedCount: z
        .number()
        .optional()
        .describe('Number of associated inferences deleted'),
      deletedInferencesCount: z
        .number()
        .optional()
        .describe('Number of inferences successfully deleted'),
      failedInferencesCount: z
        .number()
        .optional()
        .describe('Number of inference deletions that failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaygroundClient(ctx.auth.token);
    let messages: string[] = [];
    let output: Record<string, number> = {};

    if (ctx.input.avatarIds && ctx.input.avatarIds.length > 0) {
      let result = await client.deleteAvatars(ctx.input.avatarIds);
      output.deletedAvatarsCount = result.deleted_avatars_count;
      output.failedAvatarsCount = result.deletion_failed_avatars_count;
      output.associatedInferencesDeletedCount = result.associated_inferences_deleted_count;
      messages.push(`Deleted **${result.deleted_avatars_count}** avatars`);
    }

    if (ctx.input.inferenceIds && ctx.input.inferenceIds.length > 0) {
      let result = await client.deleteAvatarInferences(ctx.input.inferenceIds);
      output.deletedInferencesCount = result.deleted_inferences_count;
      output.failedInferencesCount = result.deletion_failed_inferences_count;
      messages.push(`Deleted **${result.deleted_inferences_count}** inferences`);
    }

    return {
      output: output as any,
      message:
        messages.length > 0 ? `${messages.join('. ')}.` : 'No items specified for deletion.'
    };
  })
  .build();
