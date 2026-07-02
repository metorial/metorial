import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { spec } from '../spec';

export let setUserRole = SlateTool.create(spec, {
  name: 'Set User Role',
  key: 'set_user_role',
  description: `Update a team member's role. Assign **admin** privileges (ability to manage users and team settings) or set to **user** for standard access. Requires admin privileges.`,
  constraints: [
    'A team must always have at least one admin.',
    'The target user must be in your team.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('The user ID of the team member whose role to update'),
      role: z.enum(['admin', 'user']).describe('The role to assign')
    })
  )
  .output(
    z.object({
      userId: z.string().nullable().describe('User ID'),
      name: z.string().nullable().describe('User name'),
      email: z.string().nullable().describe('User email'),
      role: z.string().nullable().describe('Updated role')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirefliesClient({ token: ctx.auth.token });
    let result = await client.setUserRole(ctx.input.userId, ctx.input.role);

    return {
      output: {
        userId: result?.id ?? ctx.input.userId,
        name: result?.name ?? null,
        email: result?.email ?? null,
        role: result?.role ?? ctx.input.role
      },
      message: `Set role for **${result?.name ?? ctx.input.userId}** to **${ctx.input.role}**.`
    };
  })
  .build();
