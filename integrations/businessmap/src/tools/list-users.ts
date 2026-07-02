import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users in your Kanbanize account. Optionally filter to show only enabled or disabled users. Returns user IDs, names, and emails useful for assigning cards and subtasks.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      enabledOnly: z
        .boolean()
        .optional()
        .describe('If true, only return enabled (active) users. Defaults to true.')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.number().describe('User ID'),
            username: z.string().optional().describe('Username'),
            email: z.string().optional().describe('User email'),
            isEnabled: z.number().optional().describe('Whether the user is enabled (0 or 1)'),
            isOwner: z
              .number()
              .optional()
              .describe('Whether the user is account owner (0 or 1)')
          })
        )
        .describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let enabledOnly = ctx.input.enabledOnly !== false;
    let result = await client.listUsers({
      isEnabled: enabledOnly ? 1 : undefined
    });

    let users = Array.isArray(result) ? result : [];

    return {
      output: {
        users: users.map((u: any) => ({
          userId: u.user_id,
          username: u.username,
          email: u.email,
          isEnabled: u.is_enabled,
          isOwner: u.is_owner
        }))
      },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();
