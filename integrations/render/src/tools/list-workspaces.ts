import { SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all Render workspaces accessible to the authenticated user. Returns workspace IDs, names, and details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum results (1-100, default 20)'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      workspaces: z.array(
        z.object({
          workspaceId: z.string().describe('Workspace ID'),
          name: z.string().describe('Workspace name'),
          type: z.string().optional().describe('Workspace type (personal or team)'),
          createdAt: z.string().optional().describe('Creation timestamp')
        })
      ),
      cursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);

    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.cursor) params.cursor = ctx.input.cursor;

    let data = await client.listWorkspaces(params);

    let lastCursor: string | undefined;
    let workspaces = (data as any[]).map((item: any) => {
      lastCursor = item.cursor;
      let w = item.owner || item.workspace || item;
      return {
        workspaceId: w.id,
        name: w.name || w.email,
        type: w.type,
        createdAt: w.createdAt
      };
    });

    return {
      output: { workspaces, cursor: lastCursor },
      message: `Found **${workspaces.length}** workspace(s).${workspaces.map(w => `\n- **${w.name}** (\`${w.workspaceId}\` — ${w.type || 'unknown'})`).join('')}`
    };
  })
  .build();
