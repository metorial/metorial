import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listCustomFields = SlateTool.create(spec, {
  name: 'List Custom Fields',
  key: 'list_custom_fields',
  description:
    'Discover custom-field IDs, API field names, types and options for accounts, contacts or opportunities before supplying custom values. Opportunity fields can be narrowed to a pipeline.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      itemClass: z.enum(['accounts', 'contacts', 'opportunities']),
      includeDisabled: z.boolean().optional().describe('Include disabled custom fields'),
      pipelineId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Pipeline ID for opportunity custom fields'),
      name: z.string().optional().describe('Filter by custom-field name')
    })
  )
  .output(
    z.object({
      fields: z.array(z.record(z.string(), z.unknown())),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    const fields = await new Client(ctx.auth.token).listCustomFields(ctx.input.itemClass, {
      includeDisabled: ctx.input.includeDisabled,
      pipeline: ctx.input.pipelineId,
      name: ctx.input.name
    });
    return {
      output: { fields, count: fields.length },
      message: `Found ${fields.length} custom field(s).`
    };
  })
  .build();
