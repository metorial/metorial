import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let envelopeSummarySchema = z.object({
  envelopeId: z.string().describe('Unique identifier of the envelope'),
  title: z.string().describe('Title of the envelope'),
  status: z.string().describe('Current status of the envelope'),
  type: z.string().describe('Type: DOCUMENT or TEMPLATE'),
  createdAt: z.string().describe('ISO timestamp when the envelope was created'),
  updatedAt: z.string().describe('ISO timestamp when the envelope was last updated')
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
      orderByColumn: z.string().optional().describe('Column to sort by'),
      orderByDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      envelopes: z
        .array(envelopeSummarySchema)
        .describe('List of envelopes matching the search criteria'),
      totalCount: z.number().optional().describe('Total number of matching envelopes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.findEnvelopes({
      query: ctx.input.query,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      type: ctx.input.type,
      status: ctx.input.status,
      folderId: ctx.input.folderId,
      orderByColumn: ctx.input.orderByColumn,
      orderByDirection: ctx.input.orderByDirection
    });

    let envelopes = (result.data ?? result.envelopes ?? result ?? []) as Record<
      string,
      unknown
    >[];
    let items = Array.isArray(envelopes) ? envelopes : [];

    return {
      output: {
        envelopes: items.map((e: Record<string, unknown>) => ({
          envelopeId: String(e.id ?? e.envelopeId ?? ''),
          title: String(e.title ?? ''),
          status: String(e.status ?? ''),
          type: String(e.type ?? ''),
          createdAt: String(e.createdAt ?? ''),
          updatedAt: String(e.updatedAt ?? '')
        })),
        totalCount: typeof result.totalCount === 'number' ? result.totalCount : undefined
      },
      message: `Found ${items.length} envelope(s)${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  })
  .build();
