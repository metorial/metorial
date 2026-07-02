import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let manageRoles = SlateTool.create(spec, {
  name: 'Manage Roles',
  key: 'manage_roles',
  description: `View, add, or remove moderator and VIP roles on a channel. List current moderators/VIPs, grant mod/VIP status to users, or revoke it.`,
  instructions: [
    'Use action "list" to view current moderators or VIPs.',
    'Use action "add" or "remove" to manage a user\'s role.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      broadcasterId: z.string().describe('Broadcaster user ID'),
      role: z.enum(['moderator', 'vip']).describe('Role type to manage'),
      action: z.enum(['list', 'add', 'remove']).describe('Action to perform'),
      userId: z
        .string()
        .optional()
        .describe('User ID to add/remove role (required for add/remove)'),
      maxResults: z.number().optional().describe('Max results for list (default 20, max 100)'),
      cursor: z.string().optional().describe('Pagination cursor for list')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string(),
            userLogin: z.string(),
            userName: z.string()
          })
        )
        .optional(),
      success: z.boolean().optional(),
      cursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);

    if (ctx.input.action === 'list') {
      if (ctx.input.role === 'moderator') {
        let result = await client.getModerators(ctx.input.broadcasterId, {
          first: ctx.input.maxResults,
          after: ctx.input.cursor
        });
        let users = result.moderators.map(m => ({
          userId: m.user_id,
          userLogin: m.user_login,
          userName: m.user_name
        }));
        return {
          output: { users, cursor: result.cursor },
          message: `Found **${users.length}** moderators`
        };
      }

      let result = await client.getVips(ctx.input.broadcasterId, {
        first: ctx.input.maxResults,
        after: ctx.input.cursor
      });
      let users = result.vips.map(v => ({
        userId: v.user_id,
        userLogin: v.user_login,
        userName: v.user_name
      }));
      return {
        output: { users, cursor: result.cursor },
        message: `Found **${users.length}** VIPs`
      };
    }

    if (!ctx.input.userId) throw new Error('userId is required for add/remove actions');

    if (ctx.input.action === 'add') {
      if (ctx.input.role === 'moderator') {
        await client.addModerator(ctx.input.broadcasterId, ctx.input.userId);
      } else {
        await client.addVip(ctx.input.broadcasterId, ctx.input.userId);
      }
      return {
        output: { success: true },
        message: `Added ${ctx.input.role} role to user \`${ctx.input.userId}\``
      };
    }

    // remove
    if (ctx.input.role === 'moderator') {
      await client.removeModerator(ctx.input.broadcasterId, ctx.input.userId);
    } else {
      await client.removeVip(ctx.input.broadcasterId, ctx.input.userId);
    }
    return {
      output: { success: true },
      message: `Removed ${ctx.input.role} role from user \`${ctx.input.userId}\``
    };
  })
  .build();
