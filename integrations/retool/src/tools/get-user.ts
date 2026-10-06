import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve detailed information about a specific Retool user by their ID. Optionally includes the groups the user belongs to.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('The ID of the user to retrieve'),
      includeGroups: z
        .boolean()
        .optional()
        .describe('Whether to include group membership information')
    })
  )
  .output(
    z.object({
      userId: z.string(),
      email: z.string(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      active: z.boolean(),
      userType: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      lastActive: z.string().nullable().optional(),
      metadata: z.record(z.string(), z.any()).nullable().optional(),
      groups: z
        .array(
          z.object({
            groupId: z.number().nullable(),
            groupName: z.string()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let result = await client.getUser(ctx.input.userId, ctx.input.includeGroups);
    let u = result.data;

    let groups = u.groups?.map(g => ({
      groupId: g.id,
      groupName: g.name
    }));

    return {
      output: {
        userId: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        active: u.active,
        userType: u.user_type,
        createdAt: u.created_at,
        lastActive: u.last_active,
        metadata: u.metadata,
        groups
      },
      message: `Retrieved user **${u.first_name} ${u.last_name}** (${u.email}), status: ${u.active ? 'active' : 'disabled'}.`
    };
  })
  .build();
