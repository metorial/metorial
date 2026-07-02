import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type ParsedDataSortBy } from '../lib/client';
import { docparserServiceError } from '../lib/errors';
import { spec } from '../spec';

let sortByValues = [
  'parsed_at',
  'processed_at',
  'uploaded_at',
  'first_processed_at',
  'imported_at',
  'integrated_at',
  'dispatched_webhook_at',
  'preprocessed_at'
] as const;

export let getParsedData = SlateTool.create(spec, {
  name: 'Get Parsed Data',
  key: 'get_parsed_data',
  description: `Retrieve structured data extracted from parsed documents. Can fetch results for a single document by ID, or for multiple documents from a parser with optional filtering and sorting. Results include parsed fields, metadata (filename, page count, timestamps), media links, and the optional remote ID.`,
  instructions: [
    'To get data for a single document, provide both `parserId` and `documentId`.',
    'To get data for multiple documents in a parser, provide only `parserId` and optionally use filtering/sorting options.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      parserId: z.string().describe('ID of the Document Parser'),
      documentId: z
        .string()
        .optional()
        .describe(
          'ID of a specific document. If omitted, returns results for multiple documents from the parser.'
        ),
      format: z
        .enum(['object', 'flat'])
        .optional()
        .describe(
          'Result format: "object" for nested JSON objects, "flat" for flat key/value pairs'
        ),
      list: z
        .enum(['last_uploaded', 'uploaded_after', 'processed_after'])
        .optional()
        .describe('Filter mode for multi-document results'),
      date: z
        .string()
        .optional()
        .describe(
          'ISO 8601 date string or Linux timestamp. Required when list is uploaded_after or processed_after.'
        ),
      remoteId: z.string().optional().describe('Filter results by remote ID'),
      sortBy: z
        .enum(sortByValues)
        .optional()
        .describe('Document timestamp field to sort multi-document results by'),
      sortOrder: z.enum(['ASC', 'DESC']).optional().describe('Sort order'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(10000)
        .optional()
        .describe('Maximum number of multi-document results to return'),
      includeChildren: z
        .boolean()
        .optional()
        .describe(
          'Include child documents created by document splitting. Applies only when documentId is provided.'
        ),
      includeProcessingQueue: z
        .boolean()
        .optional()
        .describe(
          'Include documents that are still processing. Applies only to multi-document parser results.'
        )
    })
  )
  .output(
    z.object({
      results: z
        .array(z.any())
        .describe(
          'Array of parsed data results, each containing extracted fields and metadata'
        ),
      count: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      parserId,
      documentId,
      format,
      list,
      date,
      remoteId,
      sortBy,
      sortOrder,
      limit,
      includeChildren,
      includeProcessingQueue
    } = ctx.input;

    let results: any[];

    if (documentId) {
      if (list || date || remoteId || sortBy || sortOrder || limit || includeProcessingQueue) {
        throw docparserServiceError(
          'list, date, remoteId, sortBy, sortOrder, limit, and includeProcessingQueue apply only when documentId is omitted.'
        );
      }

      results = await client.getParsedDataByDocument(parserId, documentId, {
        format,
        includeChildren
      });
    } else {
      if (includeChildren) {
        throw docparserServiceError(
          'includeChildren applies only when documentId is provided.'
        );
      }

      if ((list === 'uploaded_after' || list === 'processed_after') && !date) {
        throw docparserServiceError(
          'date is required when list is uploaded_after or processed_after.'
        );
      }

      results = await client.getParsedDataByParser(parserId, {
        format,
        list,
        date,
        remoteId,
        sortBy: sortBy as ParsedDataSortBy | undefined,
        sortOrder,
        limit,
        includeProcessingQueue
      });
    }

    return {
      output: {
        results,
        count: results.length
      },
      message: documentId
        ? `Retrieved **${results.length}** result(s) for document \`${documentId}\`.`
        : `Retrieved **${results.length}** result(s) from parser \`${parserId}\`.`
    };
  })
  .build();
