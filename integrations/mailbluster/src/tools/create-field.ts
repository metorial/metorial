import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createField = SlateTool.create(spec, {
  name: 'Create Field',
  key: 'create_field',
  description: `Creates a new custom field in your MailBluster brand. Custom fields allow you to store additional string data on leads and personalize email campaigns using merge tags.`,
  instructions: [
    'The merge tag is used as the key when setting field values on leads.',
    'Custom fields only support string data types.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fieldLabel: z
        .string()
        .describe('Display label for the custom field (e.g., "Company Name")'),
      fieldMergeTag: z
        .string()
        .describe('Merge tag key for the custom field (e.g., "company_name")')
    })
  )
  .output(
    z.object({
      fieldLabel: z.string().describe('Display label of the created field'),
      fieldMergeTag: z.string().describe('Merge tag key of the created field')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let field = await client.createField(ctx.input.fieldLabel, ctx.input.fieldMergeTag);

    return {
      output: {
        fieldLabel: field.fieldLabel,
        fieldMergeTag: field.fieldMergeTag
      },
      message: `Custom field **${field.fieldLabel}** (merge tag: \`${field.fieldMergeTag}\`) created successfully.`
    };
  })
  .build();
