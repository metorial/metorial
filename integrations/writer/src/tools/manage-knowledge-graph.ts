import { SlateTool } from 'slates';
import { z } from 'zod';
import { WriterClient } from '../lib/client';
import { spec } from '../spec';

export let createKnowledgeGraph = SlateTool.create(spec, {
  name: 'Create Knowledge Graph',
  key: 'create_knowledge_graph',
  description: `Create a new Knowledge Graph in Writer. A Knowledge Graph is a collection of files used for RAG-based question answering. After creation, add files to it using the **Manage Knowledge Graph Files** tool.`,
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
      createdAt: z.string().describe('Creation timestamp')
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
  description: `List all Knowledge Graphs in your Writer account. Returns the ID, name, description, and creation date of each graph.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      graphs: z
        .array(
          z.object({
            graphId: z.string().describe('Unique ID of the Knowledge Graph'),
            name: z.string().describe('Name of the Knowledge Graph'),
            description: z.string().describe('Description of the Knowledge Graph'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('List of Knowledge Graphs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    ctx.progress('Listing Knowledge Graphs...');
    let graphs = await client.listGraphs();

    return {
      output: { graphs },
      message: `Found **${graphs.length}** Knowledge Graph(s)`
    };
  })
  .build();

export let getKnowledgeGraph = SlateTool.create(spec, {
  name: 'Get Knowledge Graph',
  key: 'get_knowledge_graph',
  description: `Retrieve details of a specific Knowledge Graph by its ID, including its name, description, and creation date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      graphId: z.string().describe('ID of the Knowledge Graph to retrieve')
    })
  )
  .output(
    z.object({
      graphId: z.string().describe('Unique ID of the Knowledge Graph'),
      name: z.string().describe('Name of the Knowledge Graph'),
      description: z.string().describe('Description of the Knowledge Graph'),
      createdAt: z.string().describe('Creation timestamp')
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
  description: `Update the name and/or description of an existing Knowledge Graph.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      graphId: z.string().describe('ID of the Knowledge Graph to update'),
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
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    let updates: { name?: string; description?: string } = {};
    if (ctx.input.name) updates.name = ctx.input.name;
    if (ctx.input.description) updates.description = ctx.input.description;

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
  description: `Permanently delete a Knowledge Graph and disassociate all its files. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      graphId: z.string().describe('ID of the Knowledge Graph to delete')
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
