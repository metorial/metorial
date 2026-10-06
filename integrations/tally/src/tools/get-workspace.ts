import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
export const getWorkspace = SlateTool.create(spec, {
  name: 'Get Workspace',
  key: 'get_workspace',
  description: 'Read the exact discovered Tally workspace and its identity timestamps.',
  tags: { readOnly: true }
})
  .input(
    z.object({ workspaceId: z.string().describe('Exact workspace ID from list_workspaces') })
  )
  .output(
    z.object({
      workspaceId: z.string(),
      name: z.string(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const value = await new Client(ctx.auth).getWorkspace(ctx.input.workspaceId);
    return {
      output: {
        workspaceId: value.id,
        name: value.name,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt
      },
      message: 'Retrieved the exact workspace.'
    };
  })
  .build();
