import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `List and search documents with filtering by status, sender, recipients, labels, and date range. Returns paginated results with document metadata including status, signer details, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of documents per page (max 100, default 10)'),
      status: z
        .array(z.string())
        .optional()
        .describe(
          'Filter by status: WaitingForMe, WaitingForOthers, NeedAttention, Completed, Declined, Revoked, Expired, Draft'
        ),
      searchKey: z
        .string()
        .optional()
        .describe('Search by document title, ID, sender or recipient name'),
      sentBy: z.array(z.string()).optional().describe('Filter by sender email addresses'),
      recipients: z.array(z.string()).optional().describe('Filter by signer email addresses'),
      labels: z.array(z.string()).optional().describe('Filter by document tags/labels'),
      startDate: z
        .string()
        .optional()
        .describe('Filter documents created on or after this date (ISO 8601)'),
      endDate: z
        .string()
        .optional()
        .describe('Filter documents created on or before this date (ISO 8601)')
    })
  )
  .output(
    z.object({
      pageDetails: z
        .object({
          pageSize: z.number(),
          currentPage: z.number(),
          totalRecordsCount: z.number(),
          totalPages: z.number()
        })
        .describe('Pagination metadata'),
      result: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of document objects with metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listDocuments(ctx.input);

    return {
      output: result,
      message: `Found **${result.pageDetails.totalRecordsCount}** documents (page ${result.pageDetails.currentPage} of ${result.pageDetails.totalPages}).`
    };
  })
  .build();
