import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listKnowledgeBases = SlateTool.create(spec, {
  name: 'List Knowledge Bases',
  key: 'list_knowledge_bases',
  description: `List all available knowledge bases in your organization. Supports cursor-based pagination for large collections.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (max 1000, default 50)')
    })
  )
  .output(
    z.object({
      knowledgeBases: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of knowledge base objects'),
      hasMore: z.boolean().optional().describe('Whether more results are available'),
      cursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let result = await client.listKnowledgeBases(ctx.input.cursor, ctx.input.pageSize);

    return {
      output: {
        knowledgeBases: result.data,
        hasMore: result.has_more,
        cursor: result.cursor
      },
      message: `Retrieved **${result.data.length}** knowledge base(s).${result.has_more ? ' More results available.' : ''}`
    };
  })
  .build();

export let getKnowledgeBase = SlateTool.create(spec, {
  name: 'Get Knowledge Base',
  key: 'get_knowledge_base',
  description: `Retrieve details of a specific knowledge base by its ID, including its configuration, connected sources, and indexing parameters.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      knowledgeBaseId: z.string().describe('The ID of the knowledge base to retrieve')
    })
  )
  .output(
    z.object({
      knowledgeBase: z.record(z.string(), z.unknown()).describe('The knowledge base details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let kb = await client.getKnowledgeBase(ctx.input.knowledgeBaseId);

    return {
      output: {
        knowledgeBase: kb
      },
      message: `Retrieved knowledge base **${(kb as Record<string, unknown>).name || ctx.input.knowledgeBaseId}**.`
    };
  })
  .build();

export let createKnowledgeBase = SlateTool.create(spec, {
  name: 'Create Knowledge Base',
  key: 'create_knowledge_base',
  description: `Create a new knowledge base. Optionally connect it to an external data source and configure indexing parameters for RAG (Retrieval-Augmented Generation).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new knowledge base'),
      description: z.string().optional().describe('Description of the knowledge base'),
      connectionId: z
        .string()
        .optional()
        .describe('ID of an existing connection to use as a data source'),
      connectionSourceIds: z
        .array(z.string())
        .optional()
        .describe('Specific source IDs within the connection to index'),
      indexingParams: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom indexing parameters (chunking strategy, embedding model, etc.)')
    })
  )
  .output(
    z.object({
      knowledgeBase: z
        .record(z.string(), z.unknown())
        .describe('The newly created knowledge base')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let kb = await client.createKnowledgeBase({
      name: ctx.input.name,
      description: ctx.input.description,
      connectionId: ctx.input.connectionId,
      connectionSourceIds: ctx.input.connectionSourceIds,
      indexingParams: ctx.input.indexingParams
    });

    return {
      output: {
        knowledgeBase: kb
      },
      message: `Created knowledge base **${ctx.input.name}**.`
    };
  })
  .build();

export let updateKnowledgeBase = SlateTool.create(spec, {
  name: 'Update Knowledge Base',
  key: 'update_knowledge_base',
  description: `Update an existing knowledge base's properties including name, description, and indexing parameters.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      knowledgeBaseId: z.string().describe('The ID of the knowledge base to update'),
      name: z.string().optional().describe('New name for the knowledge base'),
      description: z.string().optional().describe('New description'),
      indexingParams: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated indexing parameters')
    })
  )
  .output(
    z.object({
      knowledgeBase: z.record(z.string(), z.unknown()).describe('The updated knowledge base')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let kb = await client.updateKnowledgeBase(ctx.input.knowledgeBaseId, {
      name: ctx.input.name,
      description: ctx.input.description,
      indexingParams: ctx.input.indexingParams
    });

    return {
      output: {
        knowledgeBase: kb
      },
      message: `Updated knowledge base **${ctx.input.knowledgeBaseId}**.`
    };
  })
  .build();

export let deleteKnowledgeBase = SlateTool.create(spec, {
  name: 'Delete Knowledge Base',
  key: 'delete_knowledge_base',
  description: `Permanently delete a knowledge base and all its indexed resources.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      knowledgeBaseId: z.string().describe('The ID of the knowledge base to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the knowledge base was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    await client.deleteKnowledgeBase(ctx.input.knowledgeBaseId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted knowledge base **${ctx.input.knowledgeBaseId}**.`
    };
  })
  .build();

export let syncKnowledgeBase = SlateTool.create(spec, {
  name: 'Sync Knowledge Base',
  key: 'sync_knowledge_base',
  description: `Synchronize a knowledge base with its connected data sources. Triggers re-indexing of content from the connected sources.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      knowledgeBaseId: z.string().describe('The ID of the knowledge base to synchronize')
    })
  )
  .output(
    z.object({
      syncResult: z.record(z.string(), z.unknown()).describe('Result of the sync operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let result = await client.syncKnowledgeBase(ctx.input.knowledgeBaseId);

    return {
      output: {
        syncResult: result
      },
      message: `Synchronization triggered for knowledge base **${ctx.input.knowledgeBaseId}**.`
    };
  })
  .build();

export let listKnowledgeBaseResources = SlateTool.create(spec, {
  name: 'List Knowledge Base Resources',
  key: 'list_knowledge_base_resources',
  description: `List files and resources indexed in a knowledge base. Supports cursor-based pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      knowledgeBaseId: z.string().describe('The ID of the knowledge base'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 50)')
    })
  )
  .output(
    z.object({
      resources: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of resource objects in the knowledge base'),
      hasMore: z.boolean().optional().describe('Whether more results are available'),
      cursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let result = await client.listKnowledgeBaseResources(
      ctx.input.knowledgeBaseId,
      ctx.input.cursor,
      ctx.input.pageSize
    );

    return {
      output: {
        resources: result.data,
        hasMore: result.has_more,
        cursor: result.cursor
      },
      message: `Retrieved **${result.data.length}** resource(s) from knowledge base **${ctx.input.knowledgeBaseId}**.`
    };
  })
  .build();

export let deleteKnowledgeBaseResource = SlateTool.create(spec, {
  name: 'Delete Knowledge Base Resource',
  key: 'delete_knowledge_base_resource',
  description: `Remove a specific file or resource from a knowledge base.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      knowledgeBaseId: z.string().describe('The ID of the knowledge base'),
      resourceId: z.string().describe('The ID of the resource to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the resource was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    await client.deleteKnowledgeBaseResource(ctx.input.knowledgeBaseId, ctx.input.resourceId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted resource **${ctx.input.resourceId}** from knowledge base **${ctx.input.knowledgeBaseId}**.`
    };
  })
  .build();
