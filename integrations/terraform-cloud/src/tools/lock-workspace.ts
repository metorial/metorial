import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { mapWorkspace } from '../lib/mappers';
import { spec } from '../spec';

export let lockWorkspaceTool = SlateTool.create(spec, {
  name: 'Lock/Unlock Workspace',
  key: 'lock_unlock_workspace',
  description: `Lock or unlock a workspace. Locking prevents new runs from being queued. Supports regular unlock and force-unlock (requires admin access). Provide a reason when locking to document why the workspace is locked.`,
  instructions: [
    'Use action "lock" to lock, "unlock" to unlock, or "force_unlock" to force unlock even if locked by another user.'
  ]
})
  .input(
    z.object({
      workspaceId: z.string().describe('The ID of the workspace'),
      action: z.enum(['lock', 'unlock', 'force_unlock']).describe('The action to perform'),
      reason: z.string().optional().describe('Reason for locking (only used when locking)')
    })
  )
  .output(
    z.object({
      workspaceId: z.string(),
      name: z.string(),
      locked: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response: any;

    if (ctx.input.action === 'lock') {
      response = await client.lockWorkspace(ctx.input.workspaceId, ctx.input.reason);
    } else if (ctx.input.action === 'unlock') {
      response = await client.unlockWorkspace(ctx.input.workspaceId);
    } else {
      response = await client.forceUnlockWorkspace(ctx.input.workspaceId);
    }

    let workspace = mapWorkspace(response.data);

    return {
      output: {
        workspaceId: workspace.workspaceId,
        name: workspace.name,
        locked: workspace.locked
      },
      message: `Workspace **${workspace.name}** is now ${workspace.locked ? 'locked' : 'unlocked'}.`
    };
  })
  .build();
