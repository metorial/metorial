import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve detailed information about a specific document including its status, metadata, content, summary, and chunks.
Use this to inspect a document's processing state, read its content, or access its chunks for analysis.`,
  instructions: [
    'Set includeContent to true to fetch the document text content.',
    'Set includeSummary to true to get an AI-generated summary (not available for spreadsheet/JSON files or documents exceeding 1M tokens).',
    'Set includeChunks to true to fetch the first page of document chunks.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to retrieve'),
      includeContent: z
        .boolean()
        .optional()
        .describe('Whether to include the document text content'),
      includeSummary: z
        .boolean()
        .optional()
        .describe('Whether to include an AI-generated summary'),
      includeChunks: z
        .boolean()
        .optional()
        .describe('Whether to include the first page of document chunks'),
      partition: z.string().optional().describe('Partition override')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Unique document ID'),
      name: z.string().describe('Document name'),
      status: z.string().describe('Processing status'),
      metadata: z.record(z.string(), z.any()).describe('Document metadata'),
      partition: z.string().nullable().describe('Document partition'),
      chunkCount: z.number().nullable().describe('Number of chunks'),
      externalId: z.string().nullable().describe('External reference ID'),
      pageCount: z.number().nullable().describe('Number of pages'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().describe('ISO 8601 last update timestamp'),
      content: z
        .string()
        .nullable()
        .optional()
        .describe('Document text content, if requested'),
      summary: z.string().nullable().optional().describe('AI-generated summary, if requested'),
      chunks: z
        .array(
          z.object({
            chunkId: z.string().describe('Chunk ID'),
            chunkIndex: z.number().describe('Chunk position index'),
            text: z.string().describe('Chunk text content')
          })
        )
        .optional()
        .describe('First page of document chunks, if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      partition: ctx.config.partition
    });

    let partition = ctx.input.partition;
    let doc = await client.getDocument(ctx.input.documentId, partition);

    let output: any = {
      documentId: doc.id,
      name: doc.name,
      status: doc.status,
      metadata: doc.metadata,
      partition: doc.partition,
      chunkCount: doc.chunkCount,
      externalId: doc.externalId,
      pageCount: doc.pageCount,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };

    if (ctx.input.includeContent) {
      try {
        let contentData = await client.getDocumentContent(ctx.input.documentId, { partition });
        output.content =
          typeof contentData === 'string'
            ? contentData
            : contentData.content || JSON.stringify(contentData);
      } catch (_e) {
        ctx.warn('Failed to fetch document content');
        output.content = null;
      }
    }

    if (ctx.input.includeSummary) {
      try {
        let summaryData = await client.getDocumentSummary(ctx.input.documentId, { partition });
        output.summary =
          typeof summaryData === 'string'
            ? summaryData
            : summaryData.summary || JSON.stringify(summaryData);
      } catch (_e) {
        ctx.warn('Failed to fetch document summary');
        output.summary = null;
      }
    }

    if (ctx.input.includeChunks) {
      try {
        let chunksResult = await client.getDocumentChunks(ctx.input.documentId, { partition });
        output.chunks = chunksResult.chunks.map((c: any) => ({
          chunkId: c.id,
          chunkIndex: c.index,
          text: c.text
        }));
      } catch (_e) {
        ctx.warn('Failed to fetch document chunks');
        output.chunks = [];
      }
    }

    return {
      output,
      message: `Document **${doc.name}** (status: \`${doc.status}\`)${doc.chunkCount ? `, ${doc.chunkCount} chunks` : ''}${doc.pageCount ? `, ${doc.pageCount} pages` : ''}`
    };
  })
  .build();
