import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentWorkspace = SlateTool.create(spec, {
  name: 'Get Current Workspace',
  key: 'get_current_workspace',
  description:
    'Read the workspace bound to this V2 API key. Requires workspaces:read, workspaces:all, all:read, or all:all.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaceId: z.string(),
      name: z.string(),
      ownerId: z.string(),
      timestampCreated: z.string().optional(),
      timestampUpdated: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let workspace = await new Client(ctx.auth).getCurrentWorkspace();
    return {
      output: {
        workspaceId: workspace.id,
        name: workspace.name,
        ownerId: workspace.owner,
        timestampCreated: workspace.timestamp_created,
        timestampUpdated: workspace.timestamp_updated
      },
      message: `Connected to workspace ${workspace.name}.`
    };
  })
  .build();
