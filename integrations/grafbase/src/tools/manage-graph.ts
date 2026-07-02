import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createGraph = SlateTool.create(spec, {
  name: 'Create Graph',
  key: 'create_graph',
  description: `Creates a new federated graph in a Grafbase account. Requires the account ID and a slug for the new graph. The slug must be unique within the account.`,
  instructions: [
    'Use "Get Current User" first to find the account ID for the target organization.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      accountId: z
        .string()
        .describe(
          'ID of the account (personal or organization) where the graph will be created'
        ),
      slug: z
        .string()
        .describe('URL-friendly slug for the graph. Must be unique within the account.')
    })
  )
  .output(
    z.object({
      graphId: z.string().describe('ID of the created graph'),
      slug: z.string().describe('Slug of the created graph'),
      createdAt: z.string().optional().describe('Timestamp when the graph was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let graph = await client.createGraph({
      accountId: ctx.input.accountId,
      slug: ctx.input.slug
    });

    return {
      output: {
        graphId: graph.id,
        slug: graph.slug,
        createdAt: graph.createdAt
      },
      message: `Created graph **${graph.slug}** (ID: ${graph.id}).`
    };
  })
  .build();

export let getGraph = SlateTool.create(spec, {
  name: 'Get Graph',
  key: 'get_graph',
  description: `Retrieves details about a federated graph including its branches, account information, and configuration. Look up by account/graph slug pair or by graph ID directly.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountSlug: z
        .string()
        .optional()
        .describe('Account slug (personal or organization). Required when using graphSlug.'),
      graphSlug: z
        .string()
        .optional()
        .describe('Slug of the graph to retrieve. Used together with accountSlug.'),
      graphId: z
        .string()
        .optional()
        .describe('Direct graph ID. Use this as an alternative to accountSlug + graphSlug.')
    })
  )
  .output(
    z.object({
      graphId: z.string().describe('ID of the graph'),
      slug: z.string().describe('Slug of the graph'),
      createdAt: z.string().optional().describe('Timestamp when the graph was created'),
      accountId: z.string().optional().describe('ID of the owning account'),
      accountName: z.string().optional().describe('Name of the owning account'),
      accountSlug: z.string().optional().describe('Slug of the owning account'),
      branches: z
        .array(
          z.object({
            branchId: z.string().describe('ID of the branch'),
            name: z.string().describe('Name of the branch')
          })
        )
        .describe('Branches of the graph')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let graph: any;

    if (ctx.input.graphId) {
      graph = await client.getGraphById(ctx.input.graphId);
    } else if (ctx.input.accountSlug && ctx.input.graphSlug) {
      graph = await client.getGraph(ctx.input.accountSlug, ctx.input.graphSlug);
    } else {
      throw new Error('Provide either graphId, or both accountSlug and graphSlug.');
    }

    if (!graph) {
      throw new Error('Graph not found.');
    }

    let branches = (graph.branches?.nodes || []).map((b: any) => ({
      branchId: b.id,
      name: b.name
    }));

    return {
      output: {
        graphId: graph.id,
        slug: graph.slug,
        createdAt: graph.createdAt,
        accountId: graph.account?.id,
        accountName: graph.account?.name,
        accountSlug: graph.account?.slug,
        branches
      },
      message: `Retrieved graph **${graph.slug}** with ${branches.length} branch(es).`
    };
  })
  .build();

export let deleteGraph = SlateTool.create(spec, {
  name: 'Delete Graph',
  key: 'delete_graph',
  description: `Permanently deletes a federated graph and all its branches, subgraphs, and associated data. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      graphId: z.string().describe('ID of the graph to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the graph was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    await client.deleteGraph({ graphId: ctx.input.graphId });

    return {
      output: {
        deleted: true
      },
      message: `Graph **${ctx.input.graphId}** has been permanently deleted.`
    };
  })
  .build();
