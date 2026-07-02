import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import { spec } from '../spec';

export let setCustomField = SlateTool.create(spec, {
  name: 'Set Custom Field',
  key: 'set_custom_field',
  description: `Sets a custom field value on an Ashby entity. Use the list organization tool with \`resourceType\` set to the entity type to discover available custom field IDs.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      objectType: z
        .enum(['Candidate', 'Application', 'Job', 'Opening', 'Offer'])
        .describe('The type of entity to set the field on'),
      objectId: z.string().describe('The ID of the entity'),
      fieldId: z.string().describe('The custom field definition ID'),
      fieldValue: z
        .any()
        .describe(
          'The value to set. Supports strings, numbers, booleans, currency objects ({currencyCode, value}), date strings, and arrays for multi-select fields.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      objectType: z.string(),
      objectId: z.string(),
      fieldId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AshbyClient({ token: ctx.auth.token });

    await client.setCustomFieldValue({
      objectType: ctx.input.objectType,
      objectId: ctx.input.objectId,
      fieldId: ctx.input.fieldId,
      value: ctx.input.fieldValue
    });

    return {
      output: {
        success: true,
        objectType: ctx.input.objectType,
        objectId: ctx.input.objectId,
        fieldId: ctx.input.fieldId
      },
      message: `Set custom field \`${ctx.input.fieldId}\` on ${ctx.input.objectType} \`${ctx.input.objectId}\`.`
    };
  })
  .build();
