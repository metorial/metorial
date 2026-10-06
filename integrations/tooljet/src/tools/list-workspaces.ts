import { SlateTool } from 'slates';
import { Client } from '../lib/client';
import { mappedWorkspace, workspaceSchema } from '../lib/schemas';
import { z } from '../lib/validation';
import { spec } from '../spec';
export const listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description:
    'Discover native workspace IDs, names, statuses and available groups on the Enterprise self-hosted instance. No pagination parameter is documented; collections over the local 1,000-item bound are refused.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ workspaces: z.array(workspaceSchema) }))
  .handleInvocation(async ctx => {
    const workspaces = (await new Client(ctx.auth, ctx.config).listWorkspaces()).map(
      mappedWorkspace
    );
    return {
      output: { workspaces },
      message: `Returned ${workspaces.length} native workspaces.`
    };
  })
  .build();
