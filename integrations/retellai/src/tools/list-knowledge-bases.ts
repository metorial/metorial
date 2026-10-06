import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

let knowledgeBaseSchema = z.object({
  knowledgeBaseId: z.string().describe('Unique identifier of the knowledge base'),
  knowledgeBaseName: z.string().describe('Name of the knowledge base'),
  status: z
    .string()
    .describe('Status: in_progress, complete, error, or refreshing_in_progress'),
  enableAutoRefresh: z
    .boolean()
    .optional()
    .describe('Whether auto-refresh is enabled for URLs'),
  lastRefreshedTimestamp: z.number().optional().describe('Last refresh timestamp in ms'),
  sources: z.any().optional().describe('Knowledge base sources')
});

export let listKnowledgeBases = SlateTool.create(spec, {
  name: 'List Knowledge Bases',
  key: 'list_knowledge_bases',
  description: `List all knowledge bases in your Retell AI account, including their status, sources, and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      knowledgeBases: z.array(knowledgeBaseSchema).describe('List of knowledge bases')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);
    let kbs = await client.listKnowledgeBases();

    let mapped = (kbs as any[]).map((kb: any) => ({
      knowledgeBaseId: kb.knowledge_base_id,
      knowledgeBaseName: kb.knowledge_base_name,
      status: kb.status,
      enableAutoRefresh: kb.enable_auto_refresh,
      lastRefreshedTimestamp: kb.last_refreshed_timestamp,
      sources: kb.knowledge_base_sources
    }));

    return {
      output: { knowledgeBases: mapped },
      message: `Found **${mapped.length}** knowledge base(s).`
    };
  })
  .build();

export let getKnowledgeBase = SlateTool.create(spec, {
  name: 'Get Knowledge Base',
  key: 'get_knowledge_base',
  description: `Retrieve detailed information about a specific knowledge base, including its sources and processing status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      knowledgeBaseId: z.string().describe('Unique ID of the knowledge base to retrieve')
    })
  )
  .output(knowledgeBaseSchema)
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);
    let kb = await client.getKnowledgeBase(ctx.input.knowledgeBaseId);

    return {
      output: {
        knowledgeBaseId: kb.knowledge_base_id,
        knowledgeBaseName: kb.knowledge_base_name,
        status: kb.status,
        enableAutoRefresh: kb.enable_auto_refresh,
        lastRefreshedTimestamp: kb.last_refreshed_timestamp,
        sources: kb.knowledge_base_sources
      },
      message: `Retrieved knowledge base **${kb.knowledge_base_name}** (${kb.status}).`
    };
  })
  .build();

export let deleteKnowledgeBase = SlateTool.create(spec, {
  name: 'Delete Knowledge Base',
  key: 'delete_knowledge_base',
  description: `Delete a knowledge base from your Retell AI account. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      knowledgeBaseId: z.string().describe('Unique ID of the knowledge base to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);
    await client.deleteKnowledgeBase(ctx.input.knowledgeBaseId);

    return {
      output: { success: true },
      message: `Deleted knowledge base **${ctx.input.knowledgeBaseId}**.`
    };
  })
  .build();

export let createKnowledgeBase = SlateTool.create(spec, {
  name: 'Create Knowledge Base',
  key: 'create_knowledge_base',
  description:
    'Create a knowledge base from text and public URLs for an agent response engine. Indexing is asynchronous; use get_knowledge_base to check status.'
})
  .input(
    z.object({
      name: z
        .string()
        .min(1)
        .max(39)
        .describe('Knowledge base name, fewer than 40 characters'),
      texts: z
        .array(z.object({ title: z.string().min(1), text: z.string().min(1) }))
        .optional()
        .describe('Named text sources'),
      urls: z.array(z.string().url()).optional().describe('Public URLs to scrape'),
      enableAutoRefresh: z.boolean().optional().describe('Refresh URL sources daily'),
      maxChunkSize: z.number().int().min(600).max(6000).optional(),
      minChunkSize: z.number().int().min(200).max(2000).optional()
    })
  )
  .output(knowledgeBaseSchema)
  .handleInvocation(async ctx => {
    if (!ctx.input.texts?.length && !ctx.input.urls?.length)
      throw createApiServiceError('Provide at least one text or URL source.');
    if ((ctx.input.minChunkSize ?? 400) >= (ctx.input.maxChunkSize ?? 2000))
      throw createApiServiceError('minChunkSize must be smaller than maxChunkSize.');
    let form = new FormData();
    form.append('knowledge_base_name', ctx.input.name);
    if (ctx.input.texts?.length)
      form.append('knowledge_base_texts', JSON.stringify(ctx.input.texts));
    if (ctx.input.urls?.length)
      form.append('knowledge_base_urls', JSON.stringify(ctx.input.urls));
    if (ctx.input.enableAutoRefresh !== undefined)
      form.append('enable_auto_refresh', String(ctx.input.enableAutoRefresh));
    if (ctx.input.maxChunkSize !== undefined)
      form.append('max_chunk_size', String(ctx.input.maxChunkSize));
    if (ctx.input.minChunkSize !== undefined)
      form.append('min_chunk_size', String(ctx.input.minChunkSize));
    let kb = await new RetellClient(ctx.auth.token).createKnowledgeBase(form);
    return {
      output: {
        knowledgeBaseId: kb.knowledge_base_id,
        knowledgeBaseName: kb.knowledge_base_name,
        status: kb.status,
        enableAutoRefresh: kb.enable_auto_refresh,
        sources: kb.knowledge_base_sources,
        lastRefreshedTimestamp: kb.last_refreshed_timestamp
      },
      message: `Created knowledge base **${kb.knowledge_base_name}** (${kb.status}).`
    };
  })
  .build();
