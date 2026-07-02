import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageKnowledgeBase = SlateTool.create(spec, {
  name: 'Manage Knowledge Base',
  key: 'manage_knowledge_base',
  description: `Create, retrieve, list, or delete knowledge bases used by agents for RAG (Retrieval-Augmented Generation). Knowledge bases allow agents to reference external content during conversations.`,
  instructions: [
    'To create a knowledge base from a URL, provide the sourceUrl.',
    'Only PDF files and URLs are supported as knowledge base sources.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list', 'delete']).describe('Action to perform'),
      knowledgeBaseId: z
        .string()
        .optional()
        .describe('Knowledge base ID (required for "get" and "delete")'),
      sourceUrl: z
        .string()
        .optional()
        .describe('URL to ingest as knowledge base (required for "create")'),
      chunkSize: z
        .number()
        .optional()
        .describe('Chunk size for document splitting (default: 512)'),
      similarityTopK: z
        .number()
        .optional()
        .describe('Number of similar chunks to retrieve (default: 15)'),
      overlapping: z.number().optional().describe('Chunk overlap size (default: 128)'),
      languageSupport: z
        .enum(['multilingual'])
        .optional()
        .describe('Set to "multilingual" for 100+ language support')
    })
  )
  .output(
    z.object({
      knowledgeBases: z
        .array(
          z.object({
            knowledgeBaseId: z.string().describe('Knowledge base ID'),
            fileName: z.string().optional().describe('File or source name'),
            sourceType: z.string().optional().describe('Source type (pdf or url)'),
            status: z.string().optional().describe('Processing status'),
            chunkSize: z.number().optional(),
            similarityTopK: z.number().optional(),
            overlapping: z.number().optional(),
            languageSupport: z.string().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
          })
        )
        .describe('Knowledge base details'),
      operationStatus: z.string().optional().describe('Operation result status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let input = ctx.input;

    if (input.action === 'create') {
      if (!input.sourceUrl)
        throw new Error('sourceUrl is required to create a knowledge base');

      let result = await client.createKnowledgeBaseFromUrl(input.sourceUrl, {
        chunkSize: input.chunkSize,
        similarityTopK: input.similarityTopK,
        overlapping: input.overlapping,
        languageSupport: input.languageSupport
      });

      return {
        output: {
          knowledgeBases: [
            {
              knowledgeBaseId: result.rag_id,
              fileName: result.file_name,
              sourceType: result.source_type,
              status: result.status,
              languageSupport: result.language_support
            }
          ],
          operationStatus: 'created'
        },
        message: `Created knowledge base \`${result.rag_id}\` from URL. Status: **${result.status}**.`
      };
    }

    if (input.action === 'get') {
      if (!input.knowledgeBaseId) throw new Error('knowledgeBaseId is required');

      let kb = await client.getKnowledgeBase(input.knowledgeBaseId);

      return {
        output: {
          knowledgeBases: [
            {
              knowledgeBaseId: kb.rag_id,
              fileName: kb.file_name,
              status: kb.status,
              chunkSize: kb.chunk_size,
              similarityTopK: kb.similarity_top_k,
              overlapping: kb.overlapping,
              languageSupport: kb.language_support,
              createdAt: kb.created_at,
              updatedAt: kb.updated_at
            }
          ]
        },
        message: `Knowledge base \`${kb.rag_id}\`: **${kb.file_name}**, status ${kb.status}.`
      };
    }

    if (input.action === 'list') {
      let kbs = await client.listKnowledgeBases();
      let kbList = Array.isArray(kbs) ? kbs : [];

      return {
        output: {
          knowledgeBases: kbList.map((kb: any) => ({
            knowledgeBaseId: kb.rag_id,
            fileName: kb.file_name,
            status: kb.status,
            chunkSize: kb.chunk_size,
            similarityTopK: kb.similarity_top_k,
            overlapping: kb.overlapping,
            languageSupport: kb.language_support,
            createdAt: kb.created_at,
            updatedAt: kb.updated_at
          }))
        },
        message: `Found **${kbList.length}** knowledge base(s).`
      };
    }

    if (input.action === 'delete') {
      if (!input.knowledgeBaseId) throw new Error('knowledgeBaseId is required');

      await client.deleteKnowledgeBase(input.knowledgeBaseId);

      return {
        output: {
          knowledgeBases: [],
          operationStatus: 'deleted'
        },
        message: `Deleted knowledge base \`${input.knowledgeBaseId}\`.`
      };
    }

    throw new Error(`Unknown action: ${input.action}`);
  })
  .build();
