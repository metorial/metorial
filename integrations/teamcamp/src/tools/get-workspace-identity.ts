import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { optionalString, requiredString, requireRecord } from '../lib/response';
import { spec } from '../spec';

export let getWorkspaceIdentity = SlateTool.create(spec, {
  name: 'Get Workspace Identity',
  key: 'get_workspace_identity',
  description:
    'Verify the API key and identify its workspace. Returns the workspace ID, name, and the creator of the key when provided.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaceId: z.string().describe('Workspace associated with this API key'),
      workspaceName: z.string().describe('Name of the workspace'),
      createdBy: z.string().optional().describe('Entity that created the API key'),
      raw: z.unknown().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let workspace = requireRecord(await new Client(ctx.auth).verify());
    return {
      output: {
        workspaceId: requiredString(workspace.workspaceId, 'workspaceId'),
        workspaceName: requiredString(workspace.workspaceName, 'workspaceName'),
        createdBy: optionalString(workspace.createdBy),
        raw: workspace
      },
      message: `Verified workspace identity.`
    };
  })
  .build();
