import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

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
      remoteId: z.string().optional().describe('Filter results by remote ID'),
      sort: z
        .string()
        .optional()
        .describe('Field to sort results by (e.g. a timestamp field)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      includeChildren: z
        .boolean()
        .optional()
        .describe('Include child documents created by document splitting during preprocessing')
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
    let { parserId, documentId, format, list, remoteId, sort, order, limit, includeChildren } =
      ctx.input;

    let results: any[];

    if (documentId) {
      results = await client.getParsedDataByDocument(parserId, documentId, format);
    } else {
      results = await client.getParsedDataByParser(parserId, {
        format,
        list,
        remoteId,
        sort,
        order,
        limit,
        includeChildren
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
