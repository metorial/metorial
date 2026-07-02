import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFields = SlateTool.create(spec, {
  name: 'List Fields',
  key: 'list_fields',
  description: `Retrieves all custom fields configured in your MailBluster brand. Each field has a label and a merge tag key that can be used when creating or updating leads.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      fields: z
        .array(
          z.object({
            fieldLabel: z.string().describe('Display label of the custom field'),
            fieldMergeTag: z
              .string()
              .describe('Merge tag key used in API calls and email templates')
          })
        )
        .describe('List of custom fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let fields = await client.getFields();

    let mappedFields = (Array.isArray(fields) ? fields : []).map(f => ({
      fieldLabel: f.fieldLabel,
      fieldMergeTag: f.fieldMergeTag
    }));

    return {
      output: {
        fields: mappedFields
      },
      message: `Retrieved **${mappedFields.length}** custom field(s).`
    };
  })
  .build();
