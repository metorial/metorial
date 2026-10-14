import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from '../lib/client';
import { spec } from '../spec';

export let listContactAttributes = SlateTool.create(spec, {
  name: 'List Contact Attributes',
  key: 'list_contact_attributes',
  description:
    'Discover custom contact attributes and their IDs, types, and options before setting customAttributes in create_contact or update_contact.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Whole number between 1 and 100; defaults to 50'),
      after: z
        .string()
        .optional()
        .describe('Return attributes after this ID; cannot be combined with before'),
      before: z
        .string()
        .optional()
        .describe('Return attributes before this ID; cannot be combined with after')
    })
  )
  .output(
    z.object({
      attributes: z
        .array(
          z.object({
            attributeId: z.string().describe('ID to use in a custom attribute value object'),
            name: z.string().describe('Attribute name'),
            type: z.string().describe('Attribute value type'),
            readOnly: z
              .boolean()
              .optional()
              .describe(
                'Provider read_only flag; such values may only be set through integrations'
              ),
            resource: z.string().optional().describe('Resource type'),
            options: z
              .array(z.record(z.string(), z.any()))
              .optional()
              .describe('Available options for select attributes')
          })
        )
        .describe('Custom contact attributes'),
      pagination: z
        .object({
          next: z.string().nullable().optional().describe('Pass to after for the next page'),
          previous: z
            .string()
            .nullable()
            .optional()
            .describe('Pass to before for the previous page')
        })
        .optional()
        .describe('Pagination cursors')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new SuperchatClient(ctx.auth).listContactAttributes(ctx.input);
    let attributes = (result.results ?? []).map((attribute: any) => ({
      attributeId: attribute.id,
      name: attribute.name,
      type: attribute.type,
      readOnly: attribute.read_only,
      resource: attribute.resource,
      options: attribute.option_values ?? undefined
    }));
    return {
      output: { attributes, pagination: result.pagination },
      message: `Retrieved **${attributes.length}** custom contact attribute(s).`
    };
  })
  .build();
