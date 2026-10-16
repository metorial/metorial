import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KnackClient, resolveApplicationId } from '../lib/client';
import { spec } from '../spec';

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description: `Create a new record in a Knack object or view. Provide field values as key-value pairs using Knack field keys (e.g., \`field_1\`, \`field_2\`). Supports both object-based and view-based access.`,
  instructions: [
    'For view creation, use a form view and include only its input fields. Form record rules run for view mutations.',
    'Wait at least one second between related mutations so Knack calculations can finish.',
    'Field keys follow the pattern "field_1", "field_2", etc. Use the Get App Metadata tool to discover the field keys for your objects.',
    'For connection fields, provide the connected record ID as the value.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
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
        .describe(
          'Field key-value pairs for the new record (e.g., { "field_1": "value", "field_2": 42 })'
        )
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
      record = await client.createViewRecord(
        ctx.input.sceneKey,
        ctx.input.viewKey,
        ctx.input.fields
      );
    } else if (ctx.input.objectKey) {
      record = await client.createObjectRecord(ctx.input.objectKey, ctx.input.fields);
    } else {
      throw createApiServiceError(
        'Provide objectKey or both sceneKey and viewKey. Call get_app_metadata to discover keys.'
      );
    }

    let returnedRecord = ctx.input.sceneKey && ctx.input.viewKey ? record.record : record;
    let recordId = returnedRecord?.id;

    return {
      output: {
        record,
        returnedRecord,
        submitKey: typeof record.submit_key === 'string' ? record.submit_key : undefined
      },
      message:
        typeof recordId === 'string'
          ? `Created new record **${recordId}**.`
          : 'Knack completed the create request.'
    };
  })
  .build();
