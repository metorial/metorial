import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const manageKnowledgeBase = SlateTool.create(spec, {
  name: 'Manage Knowledge Base',
  key: 'manage_knowledge_base',
  description:
    'Create, retrieve, update, or delete Griptape Cloud knowledge bases. Creation and updates support managed vector knowledge bases. Use list_knowledge_bases to discover existing IDs. Upload documents with manage_bucket, supply their asset paths, and run manage_knowledge_base_job to ingest them.',
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update', 'delete']),
      knowledgeBaseId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Required for get, update, and delete. Call list_knowledge_bases to discover IDs.'
        ),
      name: z
        .string()
        .min(1)
        .max(200)
        .optional()
        .describe('Required for create; optional for update.'),
      description: z.string().min(1).max(200).optional(),
      assetPaths: z
        .array(z.string().min(1))
        .optional()
        .describe(
          'Document asset paths, such as the assetPath returned by manage_bucket upload_asset. An empty array removes document paths on update.'
        ),
      embeddingModel: z
        .enum(['text-embedding-ada-002', 'text-embedding-3-small'])
        .optional()
        .describe(
          'Embedding model for the managed vector store. Omit to use the organization default on create or retain the current model on update.'
        )
    })
  )
  .output(
    z.object({
      knowledgeBaseId: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      type: z.string().optional(),
      assetPaths: z.array(z.string()).optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    if (ctx.input.action !== 'create' && !ctx.input.knowledgeBaseId)
      throw createApiServiceError(
        'knowledgeBaseId is required. Call list_knowledge_bases to discover IDs.'
      );
    if (ctx.input.action === 'delete') {
      await client.deleteKnowledgeBase(ctx.input.knowledgeBaseId!);
      return {
        output: { knowledgeBaseId: ctx.input.knowledgeBaseId!, deleted: true },
        message: 'Deleted the knowledge base.'
      };
    }
    if (ctx.input.action === 'create' && !ctx.input.name)
      throw createApiServiceError('name is required to create a knowledge base.');
    const data = {
      name: ctx.input.name,
      description: ctx.input.description,
      assetPaths: ctx.input.assetPaths,
      embeddingModel: ctx.input.embeddingModel
    };
    const result =
      ctx.input.action === 'create'
        ? await client.createKnowledgeBase({ ...data, name: ctx.input.name! })
        : ctx.input.action === 'get'
          ? await client.getKnowledgeBase(ctx.input.knowledgeBaseId!)
          : await client.updateKnowledgeBase(ctx.input.knowledgeBaseId!, data);
    return {
      output: {
        knowledgeBaseId: result.knowledge_base_id,
        name: result.name,
        description: result.description,
        type: result.type,
        assetPaths: result.asset_paths,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      },
      message: `Knowledge base **${result.name}** (${result.knowledge_base_id}).`
    };
  })
  .build();
