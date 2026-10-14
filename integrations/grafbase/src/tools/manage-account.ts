import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description:
    'Retrieves an account by its slug and returns the account ID needed to create graphs. Call get_viewer to discover available organization slugs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      accountSlug: z
        .string()
        .describe('Account slug. Call get_viewer to discover available organization slugs.')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('ID of the account'),
      name: z.string().describe('Name of the account'),
      slug: z.string().describe('Slug of the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.auth.apiUrl ?? (ctx.config as { apiUrl?: string }).apiUrl
    });
    let account = await client.getAccountBySlug(ctx.input.accountSlug);
    return {
      output: { accountId: account.id, name: account.name, slug: account.slug },
      message: `Retrieved account **${account.name}** (${account.slug}).`
    };
  })
  .build();

export let listGraphs = SlateTool.create(spec, {
  name: 'List Graphs',
  key: 'list_graphs',
  description:
    'Lists a page of graphs in an account and returns graph IDs for graph, branch, publishing, and schema-check operations. Call get_viewer to discover available organization slugs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      accountSlug: z
        .string()
        .describe('Account slug. Call get_viewer to discover available organization slugs.'),
      first: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Number of graphs to return. Defaults to 100.'),
      after: z.string().optional().describe('Cursor from a previous page of graphs.')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('ID of the owning account'),
      accountName: z.string().describe('Name of the owning account'),
      accountSlug: z.string().describe('Slug of the owning account'),
      graphs: z.array(
        z.object({
          graphId: z.string().describe('ID of the graph'),
          slug: z.string().describe('Slug of the graph'),
          createdAt: z.string().describe('Creation timestamp')
        })
      ),
      pageInfo: z
        .object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() })
        .describe('Pass endCursor as after when hasNextPage is true.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.auth.apiUrl ?? (ctx.config as { apiUrl?: string }).apiUrl
    });
    let account = await client.listGraphs(
      ctx.input.accountSlug,
      ctx.input.first,
      ctx.input.after
    );
    let graphs = account.graphs.nodes.map(graph => ({
      graphId: graph.id,
      slug: graph.slug,
      createdAt: graph.createdAt
    }));
    return {
      output: {
        accountId: account.id,
        accountName: account.name,
        accountSlug: account.slug,
        graphs,
        pageInfo: account.graphs.pageInfo
      },
      message: `Retrieved ${graphs.length} graph(s) in **${account.slug}**.`
    };
  })
  .build();
