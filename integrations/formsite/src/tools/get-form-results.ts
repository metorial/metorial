import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormsiteClient } from '../lib/client';
import { spec } from '../spec';

export let getFormResults = SlateTool.create(spec, {
  name: 'Get Form Results',
  key: 'get_form_results',
  description: `Retrieve form submission results with filtering, sorting, searching, and pagination. Each result includes submission metadata (dates, IP, browser, device, referrer, status) and item values. Supports date-range and ID-range filtering, search by item value, and custom Results Views.`,
  instructions: [
    'Use the Get Form Items tool first to understand item IDs and labels for interpreting result values.',
    'Maximum 500 results per request. Use the page parameter to paginate through larger result sets.',
    'Search parameters use item IDs as keys — use Get Form Items to find the correct IDs.'
  ],
  constraints: [
    'Maximum 500 results per request.',
    'Rate limited to 50 API calls per minute and 10,000 per day.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      formDir: z.string().describe('Form directory identifier'),
      afterDate: z
        .string()
        .optional()
        .describe(
          'Only return results finished after this date (ISO 8601 or YYYY-MM-DD HH:MM:SS)'
        ),
      beforeDate: z
        .string()
        .optional()
        .describe(
          'Only return results finished before this date (ISO 8601 or YYYY-MM-DD HH:MM:SS)'
        ),
      afterId: z
        .string()
        .optional()
        .describe('Only return results with ID greater than this value'),
      beforeId: z
        .string()
        .optional()
        .describe('Only return results with ID less than this value'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 100, max: 500)'),
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      sortId: z
        .string()
        .optional()
        .describe(
          'Field to sort by — a meta field name (e.g., result_id, date_finish) or item ID'
        ),
      sortDirection: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort direction (default: desc)'),
      resultsView: z
        .string()
        .optional()
        .describe('Apply a predefined Results View to control which columns are returned'),
      searchEquals: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Search for results where item equals value. Keys are item IDs, values are search terms.'
        ),
      searchContains: z
        .record(z.string(), z.string())
        .optional()
        .describe('Search for results where text item contains value. Keys are item IDs.'),
      searchBegins: z
        .record(z.string(), z.string())
        .optional()
        .describe('Search for results where text item begins with value. Keys are item IDs.'),
      searchEnds: z
        .record(z.string(), z.string())
        .optional()
        .describe('Search for results where text item ends with value. Keys are item IDs.'),
      searchMethod: z
        .enum(['and', 'or'])
        .optional()
        .describe('Combine multiple search criteria with AND or OR logic (default: and)')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            resultId: z.string().describe('Unique result/submission identifier'),
            dateStart: z.string().describe('When the user started filling out the form'),
            dateFinish: z.string().describe('When the user submitted the form'),
            dateUpdate: z.string().describe('When the result was last updated'),
            userIp: z.string().describe('IP address of the submitter'),
            userBrowser: z.string().describe('Browser used by the submitter'),
            userDevice: z.string().describe('Device type used by the submitter'),
            userReferrer: z.string().describe('Referrer URL'),
            resultStatus: z.string().describe('Result status'),
            loginUsername: z
              .string()
              .optional()
              .describe('Save & Return username if applicable'),
            loginEmail: z.string().optional().describe('Save & Return email if applicable'),
            paymentStatus: z.string().optional().describe('Payment status if applicable'),
            paymentAmount: z.string().optional().describe('Payment amount if applicable'),
            items: z
              .array(
                z.object({
                  itemId: z
                    .string()
                    .describe('Item/field ID matching the form item definitions'),
                  value: z.string().describe('Submitted value for this item')
                })
              )
              .describe('Submitted field values')
          })
        )
        .describe('List of form submission results'),
      pagination: z
        .object({
          limit: z.number().describe('Results per page'),
          pageCurrent: z.number().describe('Current page number'),
          pageLast: z.number().describe('Last page number')
        })
        .describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormsiteClient({
      token: ctx.auth.token,
      server: ctx.config.server,
      userDir: ctx.config.userDir
    });

    let { results, pagination } = await client.getFormResults(ctx.input.formDir, {
      afterDate: ctx.input.afterDate,
      beforeDate: ctx.input.beforeDate,
      afterId: ctx.input.afterId,
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit,
      page: ctx.input.page,
      sortId: ctx.input.sortId,
      sortDirection: ctx.input.sortDirection,
      resultsView: ctx.input.resultsView,
      searchEquals: ctx.input.searchEquals,
      searchContains: ctx.input.searchContains,
      searchBegins: ctx.input.searchBegins,
      searchEnds: ctx.input.searchEnds,
      searchMethod: ctx.input.searchMethod
    });

    return {
      output: { results, pagination },
      message: `Retrieved **${results.length}** result(s) for form \`${ctx.input.formDir}\` (page ${pagination.pageCurrent} of ${pagination.pageLast}).`
    };
  })
  .build();
