import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let getFormResponses = SlateTool.create(spec, {
  name: 'Get Form Responses',
  key: 'get_form_responses',
  description: `Retrieve form responses submitted through feedback forms linked to campaigns. Can also list available forms. Use this to access lead capture data and survey responses collected via QR code, beacon, or NFC interactions.`,
  instructions: [
    'Use action "list_forms" to discover available forms and their IDs.',
    'Use action "get_responses" with a formId to retrieve submitted responses.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Page number for current API pagination'),
      pageSize: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Number of results per page for current API pagination'),
      action: z
        .enum(['list_forms', 'get_responses'])
        .describe('Action: "list_forms" to browse forms, "get_responses" to get submissions'),
      organizationId: z
        .string()
        .optional()
        .describe(
          'Organization ID from list_organizations; uses the configured default when omitted'
        ),
      since: z
        .string()
        .optional()
        .describe('Earliest response timestamp in epoch milliseconds'),
      until: z.string().optional().describe('Latest response timestamp in epoch milliseconds'),
      timezone: z.string().optional().describe('Timezone for response timestamps'),
      formId: z.number().optional().describe('Form ID (required for get_responses)'),
      search: z.string().optional().describe('Search forms by title (for list_forms)'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete provider response'),
      forms: z
        .array(
          z.object({
            formId: z.number().describe('Form ID'),
            title: z.string().optional().describe('Form title'),
            formType: z.string().optional().describe('Form type'),
            url: z.string().optional().describe('Form URL'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of forms (for list_forms)'),
      totalFormCount: z.number().optional().describe('Total form count'),
      responses: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Form response submissions (for get_responses)'),
      totalResponseCount: z.number().optional().describe('Total response count')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.action === 'get_responses' && ctx.input.formId === undefined) {
      throw createApiServiceError('Provide formId from list_forms to retrieve responses.');
    }
    let client = new BeaconstacClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    if (ctx.input.action === 'list_forms') {
      let result = await client.listForms({
        search: ctx.input.search,
        page: ctx.input.page,
        pageSize: ctx.input.pageSize,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let forms = result.results.map(f => ({
        formId: f.id,
        title: typeof f.title === 'string' ? f.title : undefined,
        formType: typeof f.form_type === 'string' ? f.form_type : undefined,
        url: typeof f.url === 'string' ? f.url : undefined,
        createdAt: typeof f.created === 'string' ? f.created : undefined
      }));

      return {
        output: {
          raw: result,
          totalFormCount: result.count,
          forms
        },
        message: `Found **${result.count}** form(s). Showing ${forms.length} result(s).`
      };
    }

    // get_responses
    let result = await client.listFormResponses(ctx.input.formId!, {
      organization: ctx.input.organizationId ?? ctx.config.organizationId,
      since: ctx.input.since,
      until: ctx.input.until,
      timezone: ctx.input.timezone,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        raw: result,
        totalResponseCount: result.count,
        responses: result.results
      },
      message: `Found **${result.count}** response(s) for form ID **${ctx.input.formId}**. Showing ${result.results.length} result(s).`
    };
  })
  .build();
