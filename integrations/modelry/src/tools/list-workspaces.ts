import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all workspaces in your Modelry account. Workspaces are organizational containers for products and assets.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaces: z
        .array(
          z.object({
            workspaceId: z.string().describe('ID of the workspace.'),
            name: z.string().describe('Name of the workspace.')
          })
        )
        .describe('List of workspaces.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listWorkspaces();

    let workspaces = result.data.map(workspace => ({
      workspaceId: workspace.id,
      name: workspace.attributes.name
    }));

    return {
      output: { workspaces },
      message: `Found **${workspaces.length}** workspace(s).`
    };
  })
  .build();
