import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkspacesTool = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all Postman workspaces accessible to the authenticated user. Optionally filter by workspace type (personal, team, private, public, partner).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum(['personal', 'team', 'private', 'public', 'partner'])
        .optional()
        .describe('Filter workspaces by type')
    })
  )
  .output(
    z.object({
      workspaces: z.array(
        z.object({
          workspaceId: z.string(),
          name: z.string(),
          type: z.string().optional(),
          visibility: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let workspaces = await client.listWorkspaces(
      ctx.input.type ? { type: ctx.input.type } : undefined
    );

    let result = workspaces.map((w: any) => ({
      workspaceId: w.id,
      name: w.name,
      type: w.type,
      visibility: w.visibility
    }));

    return {
      output: { workspaces: result },
      message: `Found **${result.length}** workspace(s)${ctx.input.type ? ` of type "${ctx.input.type}"` : ''}.`
    };
  })
  .build();
