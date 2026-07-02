import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendlaneClient } from '../lib/client';
import { spec } from '../spec';

export let updateContactCustomFields = SlateTool.create(spec, {
  name: 'Update Contact Custom Fields',
  key: 'update_contact_custom_fields',
  description: `Set or update custom field values for a specific contact. Custom fields must already exist in your Sendlane account before values can be assigned.`,
  constraints: [
    'Custom fields cannot be created via the API — create them first in the Sendlane dashboard.',
    'Custom fields cannot be deleted once created.'
  ]
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to update'),
      customFields: z
        .record(z.string(), z.string())
        .describe('Custom field values as key-value pairs (field name → value)')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      customFields: z
        .array(
          z.object({
            customFieldId: z.number(),
            value: z.string()
          })
        )
        .describe('Updated custom field values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendlaneClient(ctx.auth.token);

    await client.updateContactCustomFields(ctx.input.contactId, ctx.input.customFields);
    let updated = await client.getContactCustomFields(ctx.input.contactId);

    return {
      output: {
        success: true,
        customFields: updated.map(cf => ({
          customFieldId: cf.custom_field_id,
          value: cf.value ?? ''
        }))
      },
      message: `Updated **${Object.keys(ctx.input.customFields).length}** custom fields for contact ${ctx.input.contactId}.`
    };
  })
  .build();
