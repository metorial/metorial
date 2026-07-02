import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let manageDocuments = SlateTool.create(spec, {
  name: 'Manage Documents',
  key: 'manage_documents',
  description: `List, delete, reindex, or manage metadata for documents (pages) within an agent's knowledge base. Documents are individual content items ingested from data sources. You can also manage document labels for access control.`,
  instructions: [
    'Use action "list" to browse documents with optional filters for crawl/index status.',
    'Use action "delete" to remove a document by its page ID.',
    'Use action "reindex" to trigger re-indexing of a specific document.',
    'Use action "get_metadata" or "update_metadata" to manage document metadata.',
    'Use action "set_labels" to assign labels to a document for access control.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'delete', 'reindex', 'get_metadata', 'update_metadata', 'set_labels'])
        .describe('Action to perform'),
      projectId: z.number().describe('ID of the agent'),
      pageId: z
        .number()
        .optional()
        .describe('Page/document ID (required for all actions except list)'),
      page: z.number().optional().describe('Page number for list pagination'),
      limit: z.number().optional().describe('Number of results per page (for list)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort direction (for list)'),
      crawlStatus: z
        .enum(['all', 'ok', 'failed', 'n/a', 'queued', 'limited'])
        .optional()
        .describe('Filter by crawl status'),
      indexStatus: z
        .enum(['all', 'ok', 'failed', 'n/a', 'queued', 'limited'])
        .optional()
        .describe('Filter by index status'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Metadata to update (for update_metadata)'),
      labelIds: z.array(z.number()).optional().describe('Label IDs to assign (for set_labels)')
    })
  )
  .output(
    z.object({
      documents: z
        .array(
          z.object({
            pageId: z.number().describe('Document page ID'),
            pageUrl: z.string().describe('Source URL of the document'),
            crawlStatus: z.string().describe('Crawl status'),
            indexStatus: z.string().describe('Index status'),
            isFile: z.boolean().describe('Whether this is an uploaded file'),
            filename: z.string().nullable().describe('Filename if uploaded file'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of documents'),
      currentPage: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total pages'),
      totalDocuments: z.number().optional().describe('Total documents'),
      pageMetadata: z.record(z.string(), z.unknown()).optional().describe('Document metadata'),
      deleted: z.boolean().optional().describe('Whether the document was deleted'),
      reindexed: z.boolean().optional().describe('Whether reindex was triggered'),
      labelsSet: z.boolean().optional().describe('Whether labels were set')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });
    let { action, projectId, pageId } = ctx.input;

    if (action === 'list') {
      let result = await client.listPages(projectId, {
        page: ctx.input.page,
        limit: ctx.input.limit,
        order: ctx.input.order,
        crawlStatus: ctx.input.crawlStatus,
        indexStatus: ctx.input.indexStatus
      });
      return {
        output: {
          documents: result.items.map(p => ({
            pageId: p.pageId,
            pageUrl: p.pageUrl,
            crawlStatus: p.crawlStatus,
            indexStatus: p.indexStatus,
            isFile: p.isFile,
            filename: p.filename,
            createdAt: p.createdAt
          })),
          currentPage: result.currentPage,
          totalPages: result.lastPage,
          totalDocuments: result.total
        },
        message: `Found **${result.total}** document(s) for agent **${projectId}**. Showing page **${result.currentPage}** of **${result.lastPage}**.`
      };
    }

    if (!pageId) {
      throw new Error('pageId is required for this action');
    }

    if (action === 'delete') {
      await client.deletePage(projectId, pageId);
      return {
        output: { deleted: true },
        message: `Deleted document **${pageId}** from agent **${projectId}**.`
      };
    }

    if (action === 'reindex') {
      await client.reindexPage(projectId, pageId);
      return {
        output: { reindexed: true },
        message: `Triggered reindex for document **${pageId}** on agent **${projectId}**.`
      };
    }

    if (action === 'get_metadata') {
      let metadata = await client.getPageMetadata(projectId, pageId);
      return {
        output: { pageMetadata: metadata },
        message: `Retrieved metadata for document **${pageId}**.`
      };
    }

    if (action === 'update_metadata') {
      if (!ctx.input.metadata) {
        throw new Error('metadata is required for update_metadata action');
      }
      let metadata = await client.updatePageMetadata(projectId, pageId, ctx.input.metadata);
      return {
        output: { pageMetadata: metadata },
        message: `Updated metadata for document **${pageId}**.`
      };
    }

    // set_labels
    if (!ctx.input.labelIds) {
      throw new Error('labelIds is required for set_labels action');
    }
    await client.setPageLabels(projectId, pageId, ctx.input.labelIds);
    return {
      output: { labelsSet: true },
      message: `Set **${ctx.input.labelIds.length}** label(s) on document **${pageId}**.`
    };
  })
  .build();
