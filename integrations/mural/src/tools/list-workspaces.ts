import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkspacesTool = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all workspaces the authenticated user has access to. Use this to discover available workspaces before operating on rooms or murals within them.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of workspaces to return')
    })
  )
  .output(
    z.object({
      workspaces: z.array(
        z.object({
          workspaceId: z.string(),
          name: z.string(),
          createdOn: z.string().optional(),
          updatedOn: z.string().optional(),
          status: z.string().optional()
        })
      ),
      nextToken: z.string().optional().describe('Pagination token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listWorkspaces(ctx.input.limit);

    let workspaces = result.value.map(w => ({
      workspaceId: w.id,
      name: w.name,
      createdOn: w.createdOn,
      updatedOn: w.updatedOn,
      status: w.status
    }));

    return {
      output: {
        workspaces,
        nextToken: result.next
      },
      message: `Found **${workspaces.length}** workspace(s).`
    };
  })
  .build();
