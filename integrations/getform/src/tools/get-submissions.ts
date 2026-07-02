import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSubmissions = SlateTool.create(spec, {
  name: 'Get Submissions',
  key: 'get_submissions',
  description: `Retrieve and search through form submissions for a specific form. Supports pagination, keyword search filtering, timezone formatting, and optionally includes file attachment URLs.

Returns submission data including block content, status, dates, and pagination metadata.`,
  constraints: [
    'Page size is limited to 1-100 results.',
    'Requires an API key for the new Forminit API (v2). Legacy API (v1) uses a form-specific token.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('The unique form endpoint ID to retrieve submissions for.'),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Page number for pagination. Defaults to 1.'),
      size: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100). Defaults to 30 for v2 API, 10 for v1.'),
      query: z
        .string()
        .optional()
        .describe(
          'Search keyword to filter submissions. Searches across all submission data.'
        ),
      includeFiles: z
        .boolean()
        .optional()
        .describe('When true, includes file attachment URLs in the response.'),
      timezone: z
        .string()
        .optional()
        .describe(
          'IANA timezone for date formatting (e.g., "Europe/London", "America/New_York"). Defaults to UTC.'
        )
    })
  )
  .output(
    z.object({
      formId: z.string().describe('The form endpoint ID.'),
      submissions: z
        .array(
          z.object({
            submissionId: z.number().describe('Numeric ID of the submission.'),
            submissionDate: z
              .string()
              .describe('Timestamp of when the submission was received.'),
            status: z.string().describe('Submission status (e.g., "active").'),
            submissionStatus: z.string().describe('Workflow status (e.g., "open").'),
            blocks: z
              .record(z.string(), z.unknown())
              .describe(
                'Submitted data organized by block type (sender, text, tracking, etc.).'
              ),
            files: z
              .array(
                z.object({
                  name: z.string().describe('File name.'),
                  url: z.string().describe('URL to download the file.')
                })
              )
              .optional()
              .describe('Attached files, if includeFiles was true.')
          })
        )
        .describe('List of form submissions on the current page.'),
      pagination: z
        .object({
          count: z.number().describe('Number of submissions on the current page.'),
          currentPage: z.number().describe('Current page number.'),
          total: z.number().describe('Total number of submissions across all pages.'),
          firstPage: z.number().describe('First page number.'),
          lastPage: z.number().describe('Last page number.'),
          size: z.number().describe('Page size used.')
        })
        .describe('Pagination metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    ctx.progress('Fetching form submissions...');

    let result = await client.getSubmissions({
      formId: ctx.input.formId,
      page: ctx.input.page,
      size: ctx.input.size,
      query: ctx.input.query,
      files: ctx.input.includeFiles,
      timezone: ctx.input.timezone
    });

    let searchInfo = ctx.input.query ? ` matching "${ctx.input.query}"` : '';

    return {
      output: result,
      message: `Retrieved **${result.submissions.length}** submissions${searchInfo} for form **${ctx.input.formId}** (page ${result.pagination.currentPage} of ${result.pagination.lastPage}, ${result.pagination.total} total).`
    };
  })
  .build();
