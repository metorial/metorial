import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteField = SlateTool.create(spec, {
  name: 'Delete Field',
  key: 'delete_field',
  description: 'Permanently deletes a custom field. Call list_fields to discover field IDs.',
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      fieldId: z
        .number()
        .int()
        .positive()
        .describe('Field ID. Call list_fields to discover field IDs.')
    })
  )
  .output(
    z.object({
      fieldId: z.number().describe('ID of the deleted field'),
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteField(ctx.input.fieldId);
    return {
      output: { fieldId: result.id, message: result.message },
      message: `Custom field **${result.id}** deleted successfully.`
    };
  })
  .build();
