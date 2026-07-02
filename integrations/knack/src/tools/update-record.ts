import { SlateTool } from 'slates';
import { z } from 'zod';
import { KnackClient } from '../lib/client';
import { spec } from '../spec';

export let updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Update an existing record in a Knack object or view. Provide the record ID and the field values to update as key-value pairs using Knack field keys. Only specified fields will be modified; other fields remain unchanged.`,
  instructions: [
    'Only include the fields you want to change in the fields object.',
    'Field keys follow the pattern "field_1", "field_2", etc.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      recordId: z.string().describe('The ID of the record to update'),
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
        .describe('View key (e.g., "view_1") for view-based requests'),
      fields: z
        .record(z.string(), z.any())
        .describe('Field key-value pairs to update (e.g., { "field_1": "new value" })')
    })
  )
  .output(
    z.object({
      record: z
        .record(z.string(), z.any())
        .describe('The updated record with all field values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KnackClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token,
      authMode: ctx.auth.authMode
    });

    let record: any;

    if (ctx.input.sceneKey && ctx.input.viewKey) {
      record = await client.updateViewRecord(
        ctx.input.sceneKey,
        ctx.input.viewKey,
        ctx.input.recordId,
        ctx.input.fields
      );
    } else if (ctx.input.objectKey) {
      record = await client.updateObjectRecord(
        ctx.input.objectKey,
        ctx.input.recordId,
        ctx.input.fields
      );
    } else {
      throw new Error('Either objectKey or both sceneKey and viewKey must be provided');
    }

    return {
      output: { record },
      message: `Updated record **${ctx.input.recordId}**.`
    };
  })
  .build();
