import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KnackClient, resolveApplicationId } from '../lib/client';
import { spec } from '../spec';

export let deleteRecord = SlateTool.create(spec, {
  name: 'Delete Record',
  key: 'delete_record',
  description: `Delete a record from a Knack object or view by its ID. This action is permanent and cannot be undone.`,
  instructions: [
    'View-based deletion requires a delete link on the selected view. Call get_app_metadata to discover object and view keys.'
  ],
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
        .describe(
          'Object key (e.g., "object_1") for object-based requests; call get_app_metadata to discover keys'
        ),
      sceneKey: z
        .string()
        .optional()
        .describe(
          'Scene/page key (e.g., "scene_1") for view-based requests; call get_app_metadata to discover keys'
        ),
      viewKey: z
        .string()
        .optional()
        .describe(
          'View key (e.g., "view_1") for view-based requests; call get_app_metadata to discover keys'
        )
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the record was successfully deleted'),
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe('Complete deletion response from Knack')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KnackClient({
      applicationId: resolveApplicationId(ctx.auth, ctx.config),
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
      throw createApiServiceError(
        'Provide objectKey or both sceneKey and viewKey. Call get_app_metadata to discover keys.'
      );
    }

    return {
      output: { deleted: result.deleted, raw: result.raw },
      message: result.deleted
        ? `Successfully deleted record **${ctx.input.recordId}**.`
        : `Failed to delete record **${ctx.input.recordId}**.`
    };
  })
  .build();
