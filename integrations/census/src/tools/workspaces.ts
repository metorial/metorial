import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, regionFor, workspaceClient } from '../lib/client';
import { pageMetadata, paginationInput, paginationOutput, workspaceId } from '../lib/schemas';
import { spec } from '../spec';

const workspace = z.object({
  workspaceId: z.number(),
  name: z.string(),
  organizationId: z.number(),
  createdAt: z.string().nullish()
});
export const getWorkspace = SlateTool.create(spec, {
  name: 'Get Workspace',
  key: 'get_workspace',
  description:
    'Returns the authenticated workspace identity. Personal tokens require workspaceId from list_workspaces and owner/admin permission for read-only retrieval of its existing workspace key.',
  tags: { readOnly: true }
})
  .input(z.object({ workspaceId }))
  .output(workspace)
  .handleInvocation(async ctx => {
    const result = await (await workspaceClient(ctx)).getWorkspace();
    return { output: result, message: `Authenticated workspace ${result.workspaceId}.` };
  })
  .build();
export const listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description:
    'Lists organization workspaces authorized by an Activations personal token. Pass the selected workspaceId to workspace tools. Workspace API keys are already scoped; use get_workspace for their identity.',
  tags: { readOnly: true }
})
  .input(z.object(paginationInput))
  .output(z.object({ workspaces: z.array(workspace), ...paginationOutput }))
  .handleInvocation(async ctx => {
    if (ctx.auth.credentialType === 'workspace')
      throw createApiServiceError(
        'list_workspaces requires a personal access token; use get_workspace with a workspace API key.'
      );
    const result = await new Client({
      token: ctx.auth.token,
      region: regionFor(ctx.auth, ctx.config)
    }).listWorkspaces(ctx.input);
    return {
      output: {
        workspaces: result.workspaces,
        ...pageMetadata(result.workspaces.length, result.pagination)
      },
      message: `Retrieved ${result.workspaces.length} workspace(s).`
    };
  })
  .build();
