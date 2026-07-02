import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomFields = SlateTool.create(spec, {
  name: 'List Custom Fields',
  key: 'list_custom_fields',
  description: `List all custom fields defined in the workspace, or retrieve a specific custom field by ID. Custom fields store additional contact data used for personalization and workflows.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customFieldId: z
        .string()
        .optional()
        .describe('Specific custom field ID to retrieve. If omitted, lists all custom fields.')
    })
  )
  .output(
    z.object({
      customFields: z
        .array(
          z.object({
            customFieldId: z.string().describe('Custom field ID'),
            name: z.string().optional().describe('Custom field name'),
            fieldType: z
              .string()
              .optional()
              .describe('Field type (text, number, date, boolean, etc.)')
          })
        )
        .describe('List of custom fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.customFieldId) {
      let result = await client.getCustomField(ctx.input.customFieldId);
      let field = result?.data || result;
      return {
        output: {
          customFields: [
            {
              customFieldId: String(field.id || ctx.input.customFieldId),
              name: field.name,
              fieldType: field.type || field.fieldType
            }
          ]
        },
        message: `Retrieved custom field **${field.name || ctx.input.customFieldId}**.`
      };
    }

    let result = await client.listCustomFields();
    let data = result?.data || result;
    let fieldsList = Array.isArray(data) ? data : data?.customFields || data?.data || [];

    let customFields = fieldsList.map((f: any) => ({
      customFieldId: String(f.id || ''),
      name: f.name,
      fieldType: f.type || f.fieldType
    }));

    return {
      output: {
        customFields
      },
      message: `Found **${customFields.length}** custom field(s).`
    };
  })
  .build();
