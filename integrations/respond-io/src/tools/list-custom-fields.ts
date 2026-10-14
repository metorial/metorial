import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, nextCursorId } from '../lib/client';
import { spec } from '../spec';

export let listCustomFields = SlateTool.create(spec, {
  name: 'List Custom Fields',
  key: 'list_custom_fields',
  description: `List custom fields defined in the workspace, or retrieve a specific custom field by ID. Custom fields store additional contact data used for personalization and workflows.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum results to return (1-100)'),
      cursorId: z.string().optional().describe('Cursor ID returned by the previous page'),
      customFieldId: z
        .string()
        .optional()
        .describe(
          'Specific custom field ID to retrieve. If omitted, lists a page of custom fields.'
        )
    })
  )
  .output(
    z.object({
      nextCursorId: z.string().optional().describe('Cursor ID for fetching the next page'),
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
              fieldType: field.dataType ?? field.type ?? field.fieldType ?? undefined
            }
          ]
        },
        message: `Retrieved custom field **${field.name || ctx.input.customFieldId}**.`
      };
    }

    let result = await client.listCustomFields(ctx.input.limit, ctx.input.cursorId);
    let data = result?.data || result;
    let fieldsList = Array.isArray(data)
      ? data
      : data?.items || data?.customFields || data?.data || [];

    let customFields = fieldsList.map((f: any) => ({
      customFieldId: String(f.id || ''),
      name: f.name,
      fieldType: f.dataType ?? f.type ?? f.fieldType ?? undefined
    }));

    return {
      output: {
        customFields,
        nextCursorId: nextCursorId(data)
      },
      message: `Found **${customFields.length}** custom field(s).`
    };
  })
  .build();
