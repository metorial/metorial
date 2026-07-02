import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateUserRole = SlateTool.create(spec, {
  name: 'Update User Role',
  key: 'update_user_role',
  description: `Update a user's role within a specific workspace. Common roles include "admin", "builder", and "end-user".`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('UUID of the workspace to update the role in'),
      email: z.string().describe('Email address of the user whose role to update'),
      newRole: z
        .string()
        .describe('The new role to assign (e.g., "admin", "builder", "end-user")')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the role update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    await client.updateUserRole(ctx.input.workspaceId, {
      newRole: ctx.input.newRole,
      email: ctx.input.email
    });

    return {
      output: { success: true },
      message: `Updated role for **${ctx.input.email}** to **${ctx.input.newRole}** in workspace ${ctx.input.workspaceId}.`
    };
  })
  .build();
