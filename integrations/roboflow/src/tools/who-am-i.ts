import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export const whoAmITool = SlateTool.create(spec, {
  name: 'Get Authenticated Workspace',
  key: 'who_am_i',
  description: 'Verify the connected credential and return the workspace it belongs to.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaceId: z
        .string()
        .describe('Workspace URL slug associated with the connected credential')
    })
  )
  .handleInvocation(async ctx => {
    const workspaceId = await createClient(ctx.auth, ctx.config).getAuthenticatedWorkspace();
    return {
      output: { workspaceId },
      message: `Authenticated to workspace **${workspaceId}**.`
    };
  })
  .build();
