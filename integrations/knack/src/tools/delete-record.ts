import { SlateTool } from 'slates';
import { z } from 'zod';
import { KnackClient } from '../lib/client';
import { spec } from '../spec';

export let deleteRecord = SlateTool.create(spec, {
  name: 'Delete Record',
  key: 'delete_record',
  description: `Delete a record from a Knack object or view by its ID. This action is permanent and cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      recordId: z.string().describe('The ID of the record to delete'),
      objectKey: z
        .string()
        .optional()
        .describe('Object key (e.g., "object_1") for object-based requests'),
      sceneKey: z
        .string()
        .optional()
        .describe('Scene/page key (e.g., "scene_1") for view-based requests'),
      viewKey: z
        .string()
        .optional()
        .describe('View key (e.g., "view_1") for view-based requests')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the record was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KnackClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token,
      authMode: ctx.auth.authMode
    });

    let result: any;

    if (ctx.input.sceneKey && ctx.input.viewKey) {
      result = await client.deleteViewRecord(
        ctx.input.sceneKey,
        ctx.input.viewKey,
        ctx.input.recordId
      );
    } else if (ctx.input.objectKey) {
      result = await client.deleteObjectRecord(ctx.input.objectKey, ctx.input.recordId);
    } else {
      throw new Error('Either objectKey or both sceneKey and viewKey must be provided');
    }

    return {
      output: { deleted: result.deleted },
      message: result.deleted
        ? `Successfully deleted record **${ctx.input.recordId}**.`
        : `Failed to delete record **${ctx.input.recordId}**.`
    };
  })
  .build();
