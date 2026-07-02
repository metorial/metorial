import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomFields = SlateTool.create(spec, {
  name: 'List Custom Fields',
  key: 'list_custom_fields',
  description: `Lists custom fields defined for a specific entity type within a group. Returns field names, types, options (for select fields), and configuration. Use this to discover available custom fields before setting values on contacts or deals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group'),
      entityType: z
        .enum(['person', 'company'])
        .or(z.string())
        .describe('Entity type: "person", "company", or a custom deal object type name'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100, default 20)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      customFields: z
        .array(
          z.object({
            fieldName: z.string().describe('Field name'),
            fieldType: z
              .string()
              .describe(
                'Field type (textField, numericField, dateField, singleSelect, multipleSelect, userField, contactField, objectField, magicField)'
              ),
            options: z
              .array(
                z.object({
                  label: z.string(),
                  color: z.string()
                })
              )
              .optional()
              .describe('Available options for select fields'),
            config: z
              .object({
                format: z.string().optional(),
                currency: z.string().optional()
              })
              .optional()
              .describe('Field configuration')
          })
        )
        .describe('List of custom fields'),
      nextCursor: z.string().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listGroupCustomFields(ctx.input.groupId, ctx.input.entityType, {
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let nextCursor: string | null = null;
    if (result.pagination.nextLink) {
      let url = new URL(result.pagination.nextLink);
      nextCursor = url.searchParams.get('cursor');
    }

    return {
      output: {
        customFields: result.items.map(f => ({
          fieldName: f.name,
          fieldType: f.type,
          options: f.options,
          config: f.config
        })),
        nextCursor
      },
      message: `Found **${result.items.length}** custom fields${nextCursor ? ' (more available)' : ''}`
    };
  })
  .build();
