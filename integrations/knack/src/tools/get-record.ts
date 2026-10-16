import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KnackClient, resolveApplicationId } from '../lib/client';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single record by its ID from a Knack object or view. Returns all field values for the specified record. Use object-based access for full field access, or view-based access for permission-scoped results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      recordId: z.string().describe('The ID of the record to retrieve'),
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
      record: z
        .record(z.string(), z.any())
        .describe('Record object with field key-value pairs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KnackClient({
      applicationId: resolveApplicationId(ctx.auth, ctx.config),
      token: ctx.auth.token,
      authMode: ctx.auth.authMode
    });

    let record: any;

    if (ctx.input.sceneKey && ctx.input.viewKey) {
      record = await client.getViewRecord(
        ctx.input.sceneKey,
        ctx.input.viewKey,
        ctx.input.recordId
      );
    } else if (ctx.input.objectKey) {
      record = await client.getObjectRecord(ctx.input.objectKey, ctx.input.recordId);
    } else {
      throw createApiServiceError(
        'Provide objectKey or both sceneKey and viewKey. Call get_app_metadata to discover keys.'
      );
    }

    return {
      output: { record },
      message: `Retrieved record **${ctx.input.recordId}**.`
    };
  })
  .build();
