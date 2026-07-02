import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDatabases = SlateTool.create(spec, {
  name: 'List Databases',
  key: 'list_databases',
  description: `List all databases in the configured PlanetScale organization. Supports search filtering and pagination. Returns database names, states, regions, branch counts, and engine type (Vitess/MySQL or PostgreSQL).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter databases by name'),
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      perPage: z.number().optional().describe('Number of results per page (default: 25)')
    })
  )
  .output(
    z.object({
      databases: z.array(
        z.object({
          databaseId: z.string(),
          name: z.string(),
          state: z.string(),
          kind: z.string().describe('Database engine: mysql or postgresql'),
          region: z.string().optional(),
          branchesCount: z.number().optional(),
          productionBranchesCount: z.number().optional(),
          developmentBranchesCount: z.number().optional(),
          sharded: z.boolean().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          url: z.string().optional(),
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

    let result = await client.listDatabases(
      { page: ctx.input.page, perPage: ctx.input.perPage },
      ctx.input.query
    );

    let databases = result.data.map((db: any) => ({
      databaseId: db.id,
      name: db.name,
      state: db.state,
      kind: db.kind || 'mysql',
      region: db.region?.display_name || db.region?.slug,
      branchesCount: db.branches_count,
      productionBranchesCount: db.production_branches_count,
      developmentBranchesCount: db.development_branches_count,
      sharded: db.sharded,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
      url: db.url,
      htmlUrl: db.html_url
    }));

    return {
      output: {
        databases,
        currentPage: result.currentPage,
        nextPage: result.nextPage
      },
      message: `Found **${databases.length}** database(s) on page ${result.currentPage}.${result.nextPage ? ` More results available on page ${result.nextPage}.` : ''}`
    };
  });
