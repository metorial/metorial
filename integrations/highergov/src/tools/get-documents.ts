import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getDocumentReference, getDocumentRefreshAt, getDocumentUrl } from '../lib/documents';
import { spec } from '../spec';

export let getDocuments = SlateTool.create(spec, {
  name: 'Get Documents',
  key: 'get_documents',
  description: `Retrieve documents associated with a specific opportunity. Returns document metadata and time-limited download URLs for RFPs, federal schedules, protest decisions, and other related files. The **relatedKey** can be found in the \`document_path\` field of opportunity results.`,
  instructions: [
    'First search opportunities to get the document_path / related_key value, then use it here to retrieve documents.',
    'Download URLs expire after 60 minutes. Make a new request if the URL has expired.'
  ],
  constraints: ['Download URLs expire after 60 minutes.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      relatedKey: z
        .string()
        .describe(
          'Document-related key or the document_path URL returned by search_opportunities'
        ),
      ordering: z.string().optional().describe('Sort order for results'),
      pageNumber: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 10)')
    })
  )
  .output(
    z.object({
      documents: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of document records with download URLs'),
      totalCount: z.number().describe('Total number of matching documents'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.getDocuments({
      relatedKey: ctx.input.relatedKey,
      ordering: ctx.input.ordering,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let refreshAt = getDocumentRefreshAt();
    for (let document of response.results) {
      await ctx.addAttachment({
        type: 'url',
        url: getDocumentUrl(document),
        refreshReference: getDocumentReference(ctx.input, document, response.results),
        refreshAt
      });
    }

    return {
      output: {
        documents: response.results,
        totalCount: response.meta.pagination.count,
        currentPage: response.meta.pagination.page,
        totalPages: response.meta.pagination.pages
      },
      message: `Found **${response.meta.pagination.count}** documents (page ${response.meta.pagination.page} of ${response.meta.pagination.pages}). Returned **${response.results.length}** results. Download URLs expire in 60 minutes.`
    };
  })
  .build();
