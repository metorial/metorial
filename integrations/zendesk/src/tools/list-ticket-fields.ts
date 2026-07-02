import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

let optionSchema = z.object({
  optionId: z.string(),
  name: z.string().nullable(),
  value: z.string().nullable(),
  position: z.number().nullable()
});

let ticketFieldSchema = z.object({
  fieldId: z.string(),
  title: z.string(),
  type: z.string(),
  active: z.boolean(),
  required: z.boolean(),
  requiredInPortal: z.boolean(),
  visibleInPortal: z.boolean(),
  editableInPortal: z.boolean(),
  agentCanEdit: z.boolean().nullable(),
  position: z.number().nullable(),
  description: z.string().nullable(),
  titleInPortal: z.string().nullable(),
  tag: z.string().nullable(),
  customFieldOptions: z.array(optionSchema),
  systemFieldOptions: z.array(optionSchema),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable()
});

let mapOption = (option: any) => ({
  optionId: option.id ? String(option.id) : '',
  name: option.name || option.raw_name || null,
  value: option.value || null,
  position: option.position ?? null
});

let mapTicketField = (field: any) => ({
  fieldId: String(field.id),
  title: field.title,
  type: field.type,
  active: field.active ?? false,
  required: field.required ?? false,
  requiredInPortal: field.required_in_portal ?? false,
  visibleInPortal: field.visible_in_portal ?? false,
  editableInPortal: field.editable_in_portal ?? false,
  agentCanEdit: typeof field.agent_can_edit === 'boolean' ? field.agent_can_edit : null,
  position: field.position ?? null,
  description: field.description || null,
  titleInPortal: field.title_in_portal || null,
  tag: field.tag || null,
  customFieldOptions: (field.custom_field_options || []).map(mapOption),
  systemFieldOptions: (field.system_field_options || []).map(mapOption),
  createdAt: field.created_at || null,
  updatedAt: field.updated_at || null
});

export let listTicketFields = SlateTool.create(spec, {
  name: 'List Ticket Fields',
  key: 'list_ticket_fields',
  description: `Lists Zendesk system and custom ticket fields. Use this before creating or updating tickets with custom field values.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      locale: z
        .string()
        .optional()
        .describe('Locale used for dynamic content in title_in_portal'),
      sort: z
        .string()
        .optional()
        .describe('Sort field, prefix with "-" for descending order (for example "name")'),
      includeCreator: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include creator metadata when supported'),
      pageSize: z
        .number()
        .optional()
        .describe('Cursor page size. Zendesk returns up to 100 fields per cursor page.'),
      pageAfter: z.string().optional().describe('Cursor to fetch records after'),
      pageBefore: z.string().optional().describe('Cursor to fetch records before')
    })
  )
  .output(
    z.object({
      fields: z.array(ticketFieldSchema),
      count: z.number(),
      hasMore: z.boolean().nullable(),
      afterCursor: z.string().nullable(),
      beforeCursor: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let data = await client.listTicketFields({
      creator: ctx.input.includeCreator,
      locale: ctx.input.locale,
      sort: ctx.input.sort,
      pageSize: ctx.input.pageSize,
      pageAfter: ctx.input.pageAfter,
      pageBefore: ctx.input.pageBefore
    });

    let fields = (data.ticket_fields || []).map(mapTicketField);

    return {
      output: {
        fields,
        count: fields.length,
        hasMore: typeof data.meta?.has_more === 'boolean' ? data.meta.has_more : null,
        afterCursor: data.meta?.after_cursor || null,
        beforeCursor: data.meta?.before_cursor || null
      },
      message: `Found ${fields.length} ticket field(s).`
    };
  })
  .build();
