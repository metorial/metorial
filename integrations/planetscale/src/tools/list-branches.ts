import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBranches = SlateTool.create(spec, {
  name: 'List Branches',
  key: 'list_branches',
  description: `List all branches for a PlanetScale database. Returns branch names, states, production status, and connection details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      branches: z.array(
        z.object({
          branchId: z.string(),
          name: z.string(),
          kind: z.string(),
          state: z.string(),
          production: z.boolean().optional(),
          ready: z.boolean().optional(),
          safeMigrations: z.boolean().optional(),
          sharded: z.boolean().optional(),
          parentBranch: z.string().optional(),
          region: z.string().optional(),
          mysqlAddress: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          htmlUrl: z.string().optional()
        })
      ),
      currentPage: z.number(),
      nextPage: z.number().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    let result = await client.listBranches(ctx.input.databaseName, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let branches = result.data.map((b: any) => ({
      branchId: b.id,
      name: b.name,
      kind: b.kind || 'mysql',
      state: b.state,
      production: b.production,
      ready: b.ready,
      safeMigrations: b.safe_migrations,
      sharded: b.sharded,
      parentBranch: b.parent_branch,
      region: b.region?.display_name || b.region?.slug,
      mysqlAddress: b.mysql_address,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      htmlUrl: b.html_url
    }));

    return {
      output: {
        branches,
        currentPage: result.currentPage,
        nextPage: result.nextPage
      },
      message: `Found **${branches.length}** branch(es) for database **${ctx.input.databaseName}**.`
    };
  });
