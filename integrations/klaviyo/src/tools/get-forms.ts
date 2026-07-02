import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, extractPaginationCursor } from '../lib/helpers';
import { spec } from '../spec';

export let getForms = SlateTool.create(spec, {
  name: 'Get Forms',
  key: 'get_forms',
  description: `Retrieve Klaviyo signup forms. Can fetch a single form by ID or list forms with filtering, sorting, sparse fields, and pagination.
Use this to audit active forms, find form IDs, and verify list-building entry points.`,
  instructions: [
    'Filter syntax examples: `equals(status,"live")`, `contains(name,"Popup")`, `greater-than(updated_at,2026-01-01T00:00:00Z)`.',
    'Supported sorts include `created_at`, `-created_at`, `updated_at`, and `-updated_at`.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z
        .string()
        .optional()
        .describe('Specific form ID to retrieve. Omit to list forms.'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Optional Klaviyo form fields to return.'),
      filter: z.string().optional().describe('Klaviyo filter string for listing forms.'),
      sort: z.string().optional().describe('Sort field for listing forms.'),
      pageCursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response.'),
      pageSize: z.number().optional().describe('Number of results per page (max 100).')
    })
  )
  .output(
    z.object({
      forms: z
        .array(
          z.object({
            formId: z.string().describe('Form ID'),
            name: z.string().optional().describe('Form name'),
            status: z.string().optional().describe('Form status'),
            type: z.string().optional().describe('Form type'),
            abTest: z.boolean().optional().describe('Whether the form has an A/B test'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last updated timestamp')
          })
        )
        .describe('Forms returned by Klaviyo'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.formId) {
      let result = await client.getForm(ctx.input.formId);
      let form = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: {
          forms: [
            {
              formId: form?.id ?? '',
              name: form?.attributes?.name ?? undefined,
              status: form?.attributes?.status ?? undefined,
              type: form?.attributes?.form_type ?? form?.attributes?.type ?? undefined,
              abTest: form?.attributes?.ab_test ?? undefined,
              createdAt:
                form?.attributes?.created_at ?? form?.attributes?.created ?? undefined,
              updatedAt: form?.attributes?.updated_at ?? form?.attributes?.updated ?? undefined
            }
          ],
          hasMore: false
        },
        message: `Retrieved form **${form?.attributes?.name ?? ctx.input.formId}**`
      };
    }

    let result = await client.getForms({
      fields: ctx.input.fields,
      filter: ctx.input.filter,
      sort: ctx.input.sort,
      pageCursor: ctx.input.pageCursor,
      pageSize: ctx.input.pageSize
    });
    let forms = result.data.map(form => ({
      formId: form.id ?? '',
      name: form.attributes?.name ?? undefined,
      status: form.attributes?.status ?? undefined,
      type: form.attributes?.form_type ?? form.attributes?.type ?? undefined,
      abTest: form.attributes?.ab_test ?? undefined,
      createdAt: form.attributes?.created_at ?? form.attributes?.created ?? undefined,
      updatedAt: form.attributes?.updated_at ?? form.attributes?.updated ?? undefined
    }));
    let nextCursor = extractPaginationCursor(result.links);

    return {
      output: { forms, nextCursor, hasMore: !!nextCursor },
      message: `Retrieved **${forms.length}** forms${nextCursor ? ' — more results available' : ''}`
    };
  })
  .build();
