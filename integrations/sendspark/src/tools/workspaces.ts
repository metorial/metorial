import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let getWorkspace = SlateTool.create(spec, {
  name: 'Get Connected Workspace',
  key: 'get_workspace',
  description: 'Identify the workspace associated with the connected Sendspark API key.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ workspaceId: z.string(), raw: z.unknown().optional() }))
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).getWorkspace();
    return {
      output: { workspaceId: result.workspaceId, raw: result },
      message: `Connected workspace: ${result.workspaceId}.`
    };
  })
  .build();

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description:
    "List the current user's accessible workspace IDs and names for workspace selection.",
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaces: z.array(z.object({ workspaceId: z.string(), name: z.string() })).optional(),
      raw: z.unknown().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).listWorkspaces();
    return {
      output: {
        workspaces: result.workspaces?.map((workspace: { _id: string; name: string }) => ({
          workspaceId: workspace._id,
          name: workspace.name
        })),
        raw: result
      },
      message: 'Retrieved the accessible workspace response.'
    };
  })
  .build();
