import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let formEntrySchema = z.object({
  formEntryId: z.string().optional().describe('Form entry ID'),
  formTemplateId: z.string().optional().describe('Form template (super_form) ID'),
  appointmentId: z.string().optional().describe('Associated appointment ID, if any'),
  userId: z.string().optional().describe('User ID who submitted the form'),
  content: z.any().optional().describe('Form field values'),
  deleted: z.boolean().optional().describe('Whether the form entry is deleted'),
  createdOn: z.string().optional().describe('UTC creation timestamp'),
  updatedOn: z.string().optional().describe('UTC last update timestamp')
});

export let listFormTemplatesTool = SlateTool.create(spec, {
  name: 'List Form Templates',
  key: 'list_form_templates',
  description: `Retrieve all form templates (super forms) configured in the account along with their IDs. Use this to discover form template IDs before querying form entries.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      formTemplates: z
        .array(
          z.object({
            formTemplateId: z.string().describe('Form template ID'),
            formTemplateName: z.string().describe('Form template name')
          })
        )
        .describe('List of form templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let data = await client.listFormTemplates();

    let formTemplates = Array.isArray(data)
      ? data.map((item: any) => ({
          formTemplateId: String(item.id ?? item[0] ?? ''),
          formTemplateName: String(item.name ?? item[1] ?? '')
        }))
      : [];

    return {
      output: { formTemplates },
      message: `Found **${formTemplates.length}** form template(s).`
    };
  })
  .build();

export let getFormEntriesTool = SlateTool.create(spec, {
  name: 'Get Form Entries',
  key: 'get_form_entries',
  description: `Retrieve completed form entries for a specific form template. Optionally filter by date or user. Can also retrieve a single form entry by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formEntryId: z
        .string()
        .optional()
        .describe(
          'Retrieve a single form entry by its ID. If provided, other filters are ignored.'
        ),
      formTemplateId: z
        .string()
        .optional()
        .describe(
          'Form template ID to retrieve entries for. Required when not using formEntryId.'
        ),
      from: z
        .string()
        .optional()
        .describe(
          'Only return forms updated after this time (ISO format YYYY-MM-DD HH:MM:SS)'
        ),
      userId: z.string().optional().describe('Filter by user ID, username, or foreign key'),
      limit: z.number().optional().describe('Maximum number of results (default 100)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      formEntries: z
        .array(formEntrySchema)
        .optional()
        .describe('List of form entries (when querying multiple)'),
      formEntry: formEntrySchema.optional().describe('Single form entry (when querying by ID)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.formEntryId) {
      let data = await client.getFormEntry(ctx.input.formEntryId);
      let entry = mapFormEntry(data);
      return {
        output: { formEntry: entry },
        message: `Retrieved form entry **${ctx.input.formEntryId}**.`
      };
    }

    if (!ctx.input.formTemplateId) {
      return {
        output: { formEntries: [] },
        message: 'No formTemplateId or formEntryId provided. Please specify one.'
      };
    }

    let data = await client.getFormEntries(ctx.input.formTemplateId, {
      from: ctx.input.from,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      user: ctx.input.userId
    });

    let formEntries = Array.isArray(data) ? data.map(mapFormEntry) : [];

    return {
      output: { formEntries },
      message: `Found **${formEntries.length}** form entry(ies) for template **${ctx.input.formTemplateId}**.`
    };
  })
  .build();

let mapFormEntry = (data: any): any => {
  if (!data) return {};
  return {
    formEntryId: data.id != null ? String(data.id) : undefined,
    formTemplateId: data.super_form_id != null ? String(data.super_form_id) : undefined,
    appointmentId:
      data.reservation_process_id != null ? String(data.reservation_process_id) : undefined,
    userId: data.user_id != null ? String(data.user_id) : undefined,
    content: data.content ?? undefined,
    deleted: data.deleted ?? undefined,
    createdOn: data.created_on ?? undefined,
    updatedOn: data.updated_on ?? undefined
  };
};
