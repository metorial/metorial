import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type Graph } from '../lib/client';
import { spec } from '../spec';

export let createGraph = SlateTool.create(spec, {
  name: 'Create Graph',
  key: 'create_graph',
  description: `Creates a new federated graph in a Grafbase account. Requires the account ID and a slug for the new graph. The slug must be unique within the account.`,
  instructions: ['Use "Get Account" to find the account ID for the target account slug.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      accountId: z
        .string()
        .describe(
          'Account ID. Call get_account to discover the account ID for an account slug.'
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
      apiUrl: ctx.auth.apiUrl ?? (ctx.config as { apiUrl?: string }).apiUrl
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
        .describe(
          'Direct graph ID. Call list_graphs to discover graph IDs; use this as an alternative to accountSlug + graphSlug.'
        ),
      first: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Number of branches to return. Defaults to 100.'),
      after: z.string().optional().describe('Cursor from a previous page of branches.')
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
        .describe('Branches of the graph'),
      pageInfo: z
        .object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() })
        .optional()
        .describe('Branch pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.auth.apiUrl ?? (ctx.config as { apiUrl?: string }).apiUrl
    });

    let graph: Graph | null;

    if (ctx.input.graphId) {
      graph = await client.getGraphById(ctx.input.graphId, ctx.input.first, ctx.input.after);
    } else if (ctx.input.accountSlug && ctx.input.graphSlug) {
      graph = await client.getGraph(
        ctx.input.accountSlug,
        ctx.input.graphSlug,
        ctx.input.first,
        ctx.input.after
      );
    } else {
      throw createApiServiceError(
        'Provide either graphId, or both accountSlug and graphSlug.'
      );
    }

    if (!graph) {
      throw createApiServiceError('Graph not found.');
    }

    let branches = graph.branches.nodes.map(b => ({
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
        branches,
        pageInfo: graph.branches.pageInfo
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
      apiUrl: ctx.auth.apiUrl ?? (ctx.config as { apiUrl?: string }).apiUrl
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
