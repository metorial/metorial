import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, createKnowledgeBase } from '../lib/client';
import { spec } from '../spec';

export let createKnowledgeBaseTool = SlateTool.create(spec, {
  name: 'Create Knowledge Base',
  key: 'create_knowledge_base',
  description: `Create a new knowledge base in VectorShift. Knowledge bases store and index documents for semantic search within AI workflows. Configure document processing options such as chunk size, overlap, and processing implementation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the knowledge base'),
      description: z.string().optional().describe('Description of the knowledge base'),
      fileProcessingImplementation: z
        .enum(['Default', 'Textract', 'Unstructured', 'LlamaParse', 'Other'])
        .optional()
        .describe('Document processing implementation to use'),
      chunkSize: z.number().optional().describe('Size of document chunks for indexing'),
      chunkOverlap: z
        .number()
        .optional()
        .describe('Overlap between consecutive document chunks'),
      analyzeDocuments: z
        .boolean()
        .optional()
        .describe('Enable document analysis during processing')
    })
  )
  .output(
    z.object({
      knowledgeBaseId: z.string().describe('ID of the newly created knowledge base')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result = await createKnowledgeBase(api, {
      name: ctx.input.name,
      description: ctx.input.description,
      fileProcessingImplementation: ctx.input.fileProcessingImplementation,
      chunkSize: ctx.input.chunkSize,
      chunkOverlap: ctx.input.chunkOverlap,
      analyzeDocuments: ctx.input.analyzeDocuments
    });

    return {
      output: {
        knowledgeBaseId: result.id
      },
      message: `Knowledge base **${ctx.input.name}** created with ID \`${result.id}\`.`
    };
  })
  .build();
