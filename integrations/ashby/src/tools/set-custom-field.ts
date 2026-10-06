import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import { id, invalid, pageSchema, row, unexpected, warningsSchema } from '../lib/contracts';
import { spec } from '../spec';

export let setCustomField = SlateTool.create(spec, {
  name: 'Set Custom Field',
  key: 'set_custom_field',
  description: `Sets a custom field value on an Ashby entity. Use the list organization tool with \`resourceType\` set to \`custom_fields\` to discover definitions and their supported object types. Offer fields use manage_offer forms; this endpoint does not support Offer.`,
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
      fieldValue: z.unknown().optional(),
      fieldId: z.string(),
      warnings: warningsSchema,
      pageInfo: pageSchema.optional(),
      completedActions: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new AshbyClient(ctx.auth),
      input = ctx.input;
    if (input.objectType === 'Offer')
      invalid(
        'Offer custom fields use the offer form API. Use manage_offer update with documented field paths; customField.setValue does not support Offer.'
      );
    const objectId = id(input.objectId, 'Object ID'),
      fieldId = id(input.fieldId, 'Custom field ID');
    if (input.fieldValue === undefined)
      invalid('Provide fieldValue explicitly; use null to clear a field.');
    const result = await client.post('/customField.setValue', {
      objectType: input.objectType,
      objectId,
      fieldId,
      fieldValue: input.fieldValue
    });
    const field = row(result.results);
    if (field.id !== fieldId) unexpected();
    return {
      output: {
        success: true,
        objectType: input.objectType,
        objectId,
        fieldId,
        fieldValue: field.value,
        warnings: client.warnings
      },
      message:
        'Custom field write accepted. The provider-returned value is included; check warnings before retrying.'
    };
  })
  .build();
