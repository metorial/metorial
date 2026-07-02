import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let documentSchema = z.object({
  documentName: z.string().describe('Name of the document'),
  status: z.string().describe('Processing status: queued, in_progress, completed, or failed'),
  statusMessage: z.string().optional().describe('Status message if processing failed'),
  size: z.number().optional().describe('File size in bytes'),
  contentType: z.string().optional().describe('MIME type of the document'),
  enabled: z.boolean().describe('Whether the document is enabled for retrieval'),
  chunkSize: z.number().optional().describe('Chunk size used for this document'),
  chunkOverlap: z.number().optional().describe('Chunk overlap used for this document')
});

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `List all documents in a memory. Returns document names, processing status, file metadata, and chunking configuration for each document.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      memoryName: z.string().describe('Name of the memory to list documents from')
    })
  )
  .output(
    z.object({
      documents: z.array(documentSchema).describe('List of documents in the memory')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.listDocuments(ctx.input.memoryName);

    let documents = (Array.isArray(result) ? result : []).map((d: any) => ({
      documentName: d.name ?? '',
      status: d.status ?? 'queued',
      statusMessage: d.status_message ?? undefined,
      size: d.metadata?.size,
      contentType: d.metadata?.type,
      enabled: d.enabled ?? true,
      chunkSize: d.chunk_size,
      chunkOverlap: d.chunk_overlap
    }));

    return {
      output: { documents },
      message: `Found **${documents.length}** document(s) in memory **${ctx.input.memoryName}**.`
    };
  })
  .build();

export let deleteDocument = SlateTool.create(spec, {
  name: 'Delete Document',
  key: 'delete_document',
  description: `Delete a document from a memory. This removes the document and its embeddings permanently.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      memoryName: z.string().describe('Name of the memory containing the document'),
      documentName: z.string().describe('Name of the document to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.deleteDocument(ctx.input.memoryName, ctx.input.documentName);

    return {
      output: {
        success: result.success ?? true
      },
      message: `Deleted document **${ctx.input.documentName}** from memory **${ctx.input.memoryName}**.`
    };
  })
  .build();

export let retryDocumentEmbeddings = SlateTool.create(spec, {
  name: 'Retry Document Embeddings',
  key: 'retry_document_embeddings',
  description: `Retry generating embeddings for a document that failed processing. Use this when a document's status is "failed" to re-trigger the embedding generation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      memoryName: z.string().describe('Name of the memory containing the document'),
      documentName: z.string().describe('Name of the document to retry embeddings for')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the retry was triggered successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.retryDocumentEmbeddings(
      ctx.input.memoryName,
      ctx.input.documentName
    );

    return {
      output: {
        success: result.success ?? true
      },
      message: `Retrying embeddings for document **${ctx.input.documentName}** in memory **${ctx.input.memoryName}**.`
    };
  })
  .build();
