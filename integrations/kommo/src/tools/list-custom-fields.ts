import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { spec } from '../spec';

let enumOptionSchema = z.object({
  enumId: z.number().describe('Enum option ID'),
  value: z.string().describe('Option display value'),
  sort: z.number().optional().describe('Sort order')
});

let customFieldOutputSchema = z.object({
  fieldId: z.number().describe('Custom field ID'),
  name: z.string().describe('Field name'),
  fieldType: z.string().describe('Field type (text, numeric, select, etc.)'),
  code: z.string().optional().describe('Field code'),
  sort: z.number().optional().describe('Sort order'),
  isApiOnly: z.boolean().optional().describe('Whether field is API-only'),
  isDeletable: z.boolean().optional().describe('Whether field can be deleted'),
  isPredefined: z.boolean().optional().describe('Whether field is predefined by system'),
  enums: z
    .array(enumOptionSchema)
    .optional()
    .describe('Available options for select/multiselect fields'),
  groupId: z.number().nullable().optional().describe('Custom field group ID')
});

export let listCustomFieldsTool = SlateTool.create(spec, {
  name: 'List Custom Fields',
  key: 'list_custom_fields',
  description: `List custom fields for leads, contacts, or companies. Returns field definitions including type, available options for select fields, and field IDs needed for setting custom field values on entities.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      entityType: z
        .enum(['leads', 'contacts', 'companies'])
        .describe('Entity type to list custom fields for'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page (max 250)')
    })
  )
  .output(
    z.object({
      customFields: z.array(customFieldOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let fields = await client.listCustomFields(ctx.input.entityType, {
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let mapped = fields.map((f: any) => ({
      fieldId: f.id,
      name: f.name,
      fieldType: f.type,
      code: f.code,
      sort: f.sort,
      isApiOnly: f.is_api_only,
      isDeletable: f.is_deletable,
      isPredefined: f.is_predefined,
      enums: f.enums?.map((e: any) => ({
        enumId: e.id,
        value: e.value,
        sort: e.sort
      })),
      groupId: f.group_id
    }));

    return {
      output: { customFields: mapped },
      message: `Found **${mapped.length}** custom field(s) for ${ctx.input.entityType}.`
    };
  })
  .build();
