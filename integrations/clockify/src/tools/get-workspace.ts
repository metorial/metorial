import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWorkspace = SlateTool.create(spec, {
  name: 'Get Workspace',
  key: 'get_workspace',
  description: `Get details about the configured Clockify workspace, including settings, features, and billing info.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaceId: z.string(),
      name: z.string(),
      imageUrl: z.string().optional(),
      plan: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let workspace = await client.getWorkspace();

    return {
      output: {
        workspaceId: workspace.id,
        name: workspace.name,
        imageUrl: workspace.imageUrl || undefined,
        plan: workspace.plan || undefined
      },
      message: `Workspace: **${workspace.name}** (plan: ${workspace.plan || 'unknown'}).`
    };
  })
  .build();
