import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageMap, summaryMap } from '../lib/schemas';
import { clientConfig } from '../lib/validation';
import { spec } from '../spec';

let envelopeSummarySchema = z.object({
  envelopeId: z.string().describe('Unique identifier of the envelope'),
  title: z.string().describe('Title of the envelope'),
  status: z.string().describe('Current status of the envelope'),
  type: z.string().describe('Type: DOCUMENT or TEMPLATE'),
  createdAt: z.string().describe('ISO timestamp when the envelope was created'),
  updatedAt: z.string().describe('ISO timestamp when the envelope was last updated'),
  teamId: z.number().optional(),
  ownerId: z.number().optional(),
  externalId: z.string().optional(),
  folderId: z.string().optional()
});

export let findEnvelopesTool = SlateTool.create(spec, {
  name: 'Find Envelopes',
  key: 'find_envelopes',
  description: `Search and list envelopes (documents or templates) in Documenso. Supports filtering by status, type, folder, and full-text search. Results are paginated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search query to filter envelopes by title or content'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page (1-100)'),
      type: z.enum(['DOCUMENT', 'TEMPLATE']).optional().describe('Filter by envelope type'),
      status: z
        .string()
        .optional()
        .describe('Filter by status (e.g. DRAFT, PENDING, COMPLETED)'),
      folderId: z.string().optional().describe('Filter by folder ID'),
      orderByColumn: z.string().optional().describe('Supported sort column: createdAt'),
      orderByDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      envelopes: z
        .array(envelopeSummarySchema)
        .describe('List of envelopes matching the search criteria'),
      totalCount: z.number().optional().describe('Total number of matching envelopes'),
      currentPage: z.number().optional(),
      perPage: z.number().optional(),
      totalPages: z.number().optional(),
      nextPage: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client(clientConfig(ctx)).findEnvelopes(ctx.input);
    return {
      output: { envelopes: result.data.map(summaryMap), ...pageMap(result) },
      message: `Found ${result.data.length} envelope(s) on this page.`
    };
  })
  .build();
