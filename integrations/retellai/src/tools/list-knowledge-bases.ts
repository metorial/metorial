import { SlateTool } from 'slates';
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
