import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WriterClient } from '../lib/client';
import {
  graphFileStatus,
  graphIdSchema,
  paginationInput,
  paginationOutput
} from '../lib/schemas';
import { spec } from '../spec';

export let createKnowledgeGraph = SlateTool.create(spec, {
  name: 'Create Knowledge Graph',
  key: 'create_knowledge_graph',
  description: `Create a new Knowledge Graph in Writer. A Knowledge Graph is a collection of files used for RAG-based question answering. After creation, add files to it using add_file_to_graph.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().max(255).describe('Name of the Knowledge Graph'),
      description: z
        .string()
        .max(255)
        .optional()
        .describe('Description of the Knowledge Graph')
    })
  )
  .output(
    z.object({
      graphId: z.string().describe('Unique ID of the created Knowledge Graph'),
      name: z.string().describe('Name of the Knowledge Graph'),
      description: z.string().describe('Description of the Knowledge Graph'),
      createdAt: z.string().describe('Creation timestamp'),
      fileStatus: graphFileStatus
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    ctx.progress('Creating Knowledge Graph...');
    let result = await client.createGraph(ctx.input.name, ctx.input.description);

    return {
      output: result,
      message: `Created Knowledge Graph **${result.name}** (ID: \`${result.graphId}\`)`
    };
  })
  .build();

export let listKnowledgeGraphs = SlateTool.create(spec, {
  name: 'List Knowledge Graphs',
  key: 'list_knowledge_graphs',
  description: `List a page of accessible Knowledge Graphs in your Writer account. Returns the ID, name, description, and creation date of each graph.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...paginationInput,
      teamIds: z
        .array(z.number().int().positive())
        .optional()
        .describe(
          'Optional team IDs to include team-deployed graphs. Omit for org-wide graphs; a team-scoped API key is automatically restricted to its team.'
        )
    })
  )
  .output(
    z.object({
      graphs: z
        .array(
          z.object({
            graphId: z.string().describe('Unique ID of the Knowledge Graph'),
            name: z.string().describe('Name of the Knowledge Graph'),
            description: z.string().describe('Description of the Knowledge Graph'),
            createdAt: z.string().describe('Creation timestamp'),
            fileStatus: graphFileStatus
          })
        )
        .describe('List of Knowledge Graphs'),
      ...paginationOutput
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    ctx.progress('Listing Knowledge Graphs...');
    let page = await client.listGraphs(ctx.input);
    let graphs = page.data;

    return {
      output: { graphs, hasMore: page.hasMore, firstId: page.firstId, lastId: page.lastId },
      message: `Found **${graphs.length}** Knowledge Graph(s)`
    };
  })
  .build();

export let getKnowledgeGraph = SlateTool.create(spec, {
  name: 'Get Knowledge Graph',
  key: 'get_knowledge_graph',
  description: `Retrieve details and file ingestion status for a Knowledge Graph. Call list_knowledge_graphs to discover IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      graphId: graphIdSchema
    })
  )
  .output(
    z.object({
      graphId: z.string().describe('Unique ID of the Knowledge Graph'),
      name: z.string().describe('Name of the Knowledge Graph'),
      description: z.string().describe('Description of the Knowledge Graph'),
      createdAt: z.string().describe('Creation timestamp'),
      fileStatus: graphFileStatus
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    ctx.progress('Retrieving Knowledge Graph...');
    let result = await client.getGraph(ctx.input.graphId);

    return {
      output: result,
      message: `Retrieved Knowledge Graph **${result.name}** (ID: \`${result.graphId}\`)`
    };
  })
  .build();

export let updateKnowledgeGraph = SlateTool.create(spec, {
  name: 'Update Knowledge Graph',
  key: 'update_knowledge_graph',
  description: `Update the name and/or description of an existing Knowledge Graph. Call list_knowledge_graphs to discover IDs.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      graphId: graphIdSchema,
      name: z.string().max(255).optional().describe('New name for the Knowledge Graph'),
      description: z
        .string()
        .max(255)
        .optional()
        .describe('New description for the Knowledge Graph')
    })
  )
  .output(
    z.object({
      graphId: z.string().describe('Unique ID of the Knowledge Graph'),
      name: z.string().describe('Updated name'),
      description: z.string().describe('Updated description'),
      createdAt: z.string().describe('Creation timestamp'),
      fileStatus: graphFileStatus
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    let updates: { name?: string; description?: string } = {};
    if (ctx.input.name !== undefined) updates.name = ctx.input.name;
    if (ctx.input.description !== undefined) updates.description = ctx.input.description;
    if (Object.keys(updates).length === 0)
      throw createApiServiceError(
        'Provide a name or description to update the Knowledge Graph.'
      );

    ctx.progress('Updating Knowledge Graph...');
    let result = await client.updateGraph(ctx.input.graphId, updates);

    return {
      output: result,
      message: `Updated Knowledge Graph **${result.name}** (ID: \`${result.graphId}\`)`
    };
  })
  .build();

export let deleteKnowledgeGraph = SlateTool.create(spec, {
  name: 'Delete Knowledge Graph',
  key: 'delete_knowledge_graph',
  description: `Permanently delete a Knowledge Graph and disassociate all its files. Call list_knowledge_graphs to discover IDs. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      graphId: graphIdSchema
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    ctx.progress('Deleting Knowledge Graph...');
    await client.deleteGraph(ctx.input.graphId);

    return {
      output: { deleted: true },
      message: `Deleted Knowledge Graph \`${ctx.input.graphId}\``
    };
  })
  .build();
