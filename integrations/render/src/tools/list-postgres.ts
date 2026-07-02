import { SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let listPostgres = SlateTool.create(spec, {
  name: 'List Postgres Databases',
  key: 'list_postgres',
  description: `List all Render Postgres database instances. Optionally filter by workspace/owner ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ownerId: z.string().optional().describe('Filter by workspace/owner ID'),
      limit: z.number().optional().describe('Maximum results (1-100, default 20)'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      databases: z.array(
        z.object({
          postgresId: z.string().describe('Postgres instance ID'),
          name: z.string().describe('Database name'),
          plan: z.string().optional().describe('Instance plan'),
          region: z.string().optional().describe('Region'),
          status: z.string().optional().describe('Database status'),
          version: z.string().optional().describe('Postgres version'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          ownerId: z.string().optional().describe('Workspace/owner ID')
        })
      ),
      cursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);

    let params: Record<string, any> = {};
    if (ctx.input.ownerId) params.ownerId = [ctx.input.ownerId];
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.cursor) params.cursor = ctx.input.cursor;

    let data = await client.listPostgres(params);

    let lastCursor: string | undefined;
    let databases = (data as any[]).map((item: any) => {
      lastCursor = item.cursor;
      let pg = item.postgres;
      return {
        postgresId: pg.id,
        name: pg.name,
        plan: pg.plan,
        region: pg.region,
        status: pg.status,
        version: pg.version,
        createdAt: pg.createdAt,
        ownerId: pg.ownerId
      };
    });

    return {
      output: { databases, cursor: lastCursor },
      message: `Found **${databases.length}** Postgres database(s).${databases.map(d => `\n- **${d.name}** (${d.plan || 'N/A'}) — ${d.status || 'unknown'}`).join('')}`
    };
  })
  .build();
