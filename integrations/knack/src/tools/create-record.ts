import { SlateTool } from 'slates';
import { z } from 'zod';
import { KnackClient } from '../lib/client';
import { spec } from '../spec';

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description: `Create a new record in a Knack object or view. Provide field values as key-value pairs using Knack field keys (e.g., \`field_1\`, \`field_2\`). Supports both object-based and view-based access.`,
  instructions: [
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
        .describe(
          'Field key-value pairs for the new record (e.g., { "field_1": "value", "field_2": 42 })'
        )
    })
  )
  .output(
    z.object({
      record: z
        .record(z.string(), z.any())
        .describe('The newly created record with all field values')
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
      record = await client.createViewRecord(
        ctx.input.sceneKey,
        ctx.input.viewKey,
        ctx.input.fields
      );
    } else if (ctx.input.objectKey) {
      record = await client.createObjectRecord(ctx.input.objectKey, ctx.input.fields);
    } else {
      throw new Error('Either objectKey or both sceneKey and viewKey must be provided');
    }

    let recordId = record.id || 'unknown';

    return {
      output: { record },
      message: `Created new record **${recordId}**.`
    };
  })
  .build();
