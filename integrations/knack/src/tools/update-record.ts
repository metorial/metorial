import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KnackClient, resolveApplicationId } from '../lib/client';
import { spec } from '../spec';

export let updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Update an existing record in a Knack object or view. Provide the record ID and the field values to update as key-value pairs using Knack field keys. Only specified fields will be modified; other fields remain unchanged.`,
  instructions: [
    'Only include the fields you want to change in the fields object.',
    'For views, use a form or an enabled inline-edit view and include only editable fields. Form record rules run for view mutations.',
    'Wait at least one second between related mutations so Knack calculations can finish.',
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
        ),
      fields: z
        .record(z.string(), z.any())
        .describe('Field key-value pairs to update (e.g., { "field_1": "new value" })')
    })
  )
  .output(
    z.object({
      record: z
        .record(z.string(), z.any())
        .describe(
          'Provider response: the record for object access, or record and submit_key envelope for view access'
        ),
      returnedRecord: z
        .record(z.string(), z.any())
        .optional()
        .describe('Record returned by Knack, unwrapped from a view response when applicable'),
      submitKey: z.string().optional().describe('Submit key returned by a view mutation')
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
      throw createApiServiceError(
        'Provide objectKey or both sceneKey and viewKey. Call get_app_metadata to discover keys.'
      );
    }

    let returnedRecord = ctx.input.sceneKey && ctx.input.viewKey ? record.record : record;
    return {
      output: {
        record,
        returnedRecord,
        submitKey: typeof record.submit_key === 'string' ? record.submit_key : undefined
      },
      message: `Updated record **${ctx.input.recordId}**.`
    };
  })
  .build();
