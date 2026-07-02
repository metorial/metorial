import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { docusignServiceError } from '../lib/errors';
import { spec } from '../spec';

export let listEnvelopes = SlateTool.create(spec, {
  name: 'List Envelopes',
  key: 'list_envelopes',
  description: `Searches and lists DocuSign envelopes with flexible filtering by date range, status, text, and more. Returns up to 1000 envelopes per call with pagination support.
Use **fromDate** to specify the start of the search window (required unless envelopeIds or transactionIds are provided).`,
  constraints: [
    'Maximum of 1000 envelopes returned per call. Use pagination (startPosition) for more.',
    'fromDate is required unless specific envelopeIds or transactionIds are provided.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fromDate: z
        .string()
        .optional()
        .describe(
          'Start date for the search (ISO 8601 format, e.g., "2024-01-01T00:00:00Z"). Required unless envelopeIds is provided.'
        ),
      toDate: z.string().optional().describe('End date for the search (ISO 8601 format)'),
      status: z
        .string()
        .optional()
        .describe(
          'Comma-separated envelope statuses to filter (e.g., "completed", "sent,delivered")'
        ),
      fromToStatus: z
        .string()
        .optional()
        .describe(
          'Status type for date filtering: changed, created, sent, delivered, signed, completed, declined, voided. Default: changed'
        ),
      searchText: z.string().optional().describe('Text to search for in envelope data'),
      envelopeIds: z
        .string()
        .optional()
        .describe('Comma-separated list of specific envelope IDs to retrieve'),
      transactionIds: z
        .string()
        .optional()
        .describe('Comma-separated list of transaction IDs to retrieve'),
      count: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .default(25)
        .describe('Number of results to return (max 1000)'),
      startPosition: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Starting position for pagination'),
      orderBy: z
        .enum(['created', 'last_modified', 'status'])
        .optional()
        .describe('Field to sort results by'),
      order: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort direction')
    })
  )
  .output(
    z.object({
      totalSetSize: z
        .string()
        .optional()
        .describe('Total number of envelopes matching the query'),
      resultSetSize: z.string().optional().describe('Number of envelopes in this response'),
      startPosition: z.string().optional().describe('Starting position of this result set'),
      nextUri: z.string().optional().describe('URI for the next page of results'),
      previousUri: z.string().optional().describe('URI for the previous page of results'),
      envelopes: z
        .array(
          z.object({
            envelopeId: z.string(),
            status: z.string(),
            emailSubject: z.string().optional(),
            senderName: z.string().optional(),
            senderEmail: z.string().optional(),
            createdDateTime: z.string().optional(),
            sentDateTime: z.string().optional(),
            completedDateTime: z.string().optional(),
            statusChangedDateTime: z.string().optional()
          })
        )
        .describe('List of envelopes matching the query')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.fromDate && !ctx.input.envelopeIds && !ctx.input.transactionIds) {
      throw docusignServiceError(
        'fromDate, envelopeIds, or transactionIds is required to list DocuSign envelopes.'
      );
    }

    let client = new Client({
      token: ctx.auth.token,
      baseUri: ctx.auth.baseUri,
      accountId: ctx.auth.accountId
    });

    let result = await client.listEnvelopes({
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      status: ctx.input.status,
      fromToStatus: ctx.input.fromToStatus,
      searchText: ctx.input.searchText,
      envelopeIds: ctx.input.envelopeIds,
      transactionIds: ctx.input.transactionIds,
      count: ctx.input.count?.toString(),
      startPosition: ctx.input.startPosition?.toString(),
      orderBy: ctx.input.orderBy,
      order: ctx.input.order
    });

    let envelopes = (result.envelopes || []).map((e: any) => ({
      envelopeId: e.envelopeId,
      status: e.status,
      emailSubject: e.emailSubject,
      senderName: e.sender?.userName,
      senderEmail: e.sender?.email,
      createdDateTime: e.createdDateTime,
      sentDateTime: e.sentDateTime,
      completedDateTime: e.completedDateTime,
      statusChangedDateTime: e.statusChangedDateTime
    }));

    return {
      output: {
        totalSetSize: result.totalSetSize,
        resultSetSize: result.resultSetSize,
        startPosition: result.startPosition,
        nextUri: result.nextUri,
        previousUri: result.previousUri,
        envelopes
      },
      message: `Found **${result.resultSetSize || envelopes.length}** envelopes (total: ${result.totalSetSize || 'unknown'}).`
    };
  })
  .build();
