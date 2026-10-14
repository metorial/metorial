import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFields = SlateTool.create(spec, {
  name: 'List Fields',
  key: 'list_fields',
  description:
    'Lists subscriber custom fields with the fieldName keys accepted by create_subscriber and update_subscriber.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({ page: z.number().int().min(1).optional().default(1).describe('Page number') })
  )
  .output(
    z.object({
      fields: z.array(
        z.object({
          fieldId: z
            .string()
            .nullable()
            .describe('Field ID; built-in fields may not have an ID'),
          title: z.string().describe('Display name'),
          type: z.string().describe('Field value type'),
          fieldName: z
            .string()
            .describe('Key used in subscriber customFields, including template braces'),
          isDefault: z.boolean().describe('Whether this is a built-in field')
        })
      ),
      currentPage: z.number(),
      lastPage: z.number(),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listFields(ctx.input.page);
    return {
      output: {
        fields: result.data.map(field => ({
          fieldId: field.id,
          title: field.title,
          type: field.type,
          fieldName: field.field_name,
          isDefault: field.default
        })),
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page,
        total: result.meta.total
      },
      message: `Found **${result.meta.total}** subscriber field(s).`
    };
  })
  .build();
