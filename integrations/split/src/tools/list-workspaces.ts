import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all workspaces (projects) in the Split organization. Returns workspace IDs, names, and whether they require title/comments for changes. Useful for discovering available workspaces.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter workspaces by name.'),
      offset: z.number().optional().describe('Pagination offset. Defaults to 0.'),
      limit: z.number().optional().describe('Max results to return. Defaults to 50.')
    })
  )
  .output(
    z.object({
      workspaces: z.array(
        z.object({
          workspaceId: z.string(),
          workspaceName: z.string(),
          requiresTitleAndComments: z.boolean()
        })
      ),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listWorkspaces({
      name: ctx.input.name,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let workspaces = result.objects.map(w => ({
      workspaceId: w.id,
      workspaceName: w.name,
      requiresTitleAndComments: w.requiresTitleAndComments
    }));

    return {
      output: { workspaces, totalCount: result.totalCount },
      message: `Found **${result.totalCount}** workspaces.`
    };
  })
  .build();
