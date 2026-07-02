import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubmissions = SlateTool.create(spec, {
  name: 'List Submissions',
  key: 'list_submissions',
  description: `Retrieves form submissions for a specific Formcarry form with support for pagination, sorting, and filtering. Filters can target date ranges, attachment presence, spam status, and custom field values using contains/not-contains operators.`,
  instructions: [
    'Use the **filter** parameter with comma-separated key:value pairs. Examples: `date:7` for last 7 days, `spam:false` for non-spam, `attachments:true` for submissions with files, `email_contains:@gmail.com` for custom field filtering.',
    'Use the **sort** parameter in the format `field:order` where order is `1` (ascending) or `-1` (descending). Example: `createdAt:-1` for newest first.'
  ],
  constraints: ['Maximum 50 submissions per page.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('The unique ID of the form to retrieve submissions for'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Number of results per page (1-50, default: 25)'),
      page: z.number().min(1).optional().describe('Page number for pagination (default: 1)'),
      sort: z
        .string()
        .optional()
        .describe('Sort field and order, e.g. "createdAt:-1" for newest first'),
      filter: z
        .string()
        .optional()
        .describe('Comma-separated filters, e.g. "date:7,spam:false,attachments:true"')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('The form ID these submissions belong to'),
      resultCount: z.number().describe('Number of submissions returned in this page'),
      pagination: z
        .object({
          currentPage: z.number().describe('Current page number'),
          previousPage: z
            .number()
            .nullable()
            .describe('Previous page number, or null if on first page'),
          nextPage: z
            .number()
            .nullable()
            .describe('Next page number, or null if on last page'),
          totalPages: z.number().describe('Total number of pages'),
          totalSubmissions: z
            .number()
            .describe('Total number of submissions matching the query')
        })
        .describe('Pagination details'),
      submissions: z
        .array(z.record(z.string(), z.any()))
        .describe(
          'Array of submission objects, each containing the submitted fields and metadata'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSubmissions({
      formId: ctx.input.formId,
      limit: ctx.input.limit,
      page: ctx.input.page,
      sort: ctx.input.sort,
      filter: ctx.input.filter
    });

    return {
      output: {
        formId: result.form,
        resultCount: result.results,
        pagination: {
          currentPage: result.pagination.currentPage,
          previousPage: result.pagination.previousPage,
          nextPage: result.pagination.nextPage,
          totalPages: result.pagination.totalPage,
          totalSubmissions: result.pagination.totalSubmissions
        },
        submissions: result.submissions
      },
      message: `Retrieved **${result.results}** submission(s) for form **${ctx.input.formId}** (page ${result.pagination.currentPage} of ${result.pagination.totalPage}, ${result.pagination.totalSubmissions} total).`
    };
  });
