import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      firstName: z.string(),
      lastName: z.string(),
      active: z.boolean(),
      userType: z.string().optional(),
      createdAt: z.string().optional(),
      lastActive: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
      groups: z
        .array(
          z.object({
            groupId: z.number(),
            groupName: z.string()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

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
