import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.number().describe('User ID'),
  name: z.string().describe('User name'),
  email: z.string().describe('User email'),
  active: z.boolean().describe('Whether the user is active'),
  role: z.string().nullable().describe('User role (admin, normal, limited)'),
  weeklyCapacity: z.number().nullable().describe('Weekly capacity in hours'),
  defaultHourRate: z.number().nullable().describe('Default hourly rate'),
  timeZone: z.string().nullable().describe('User timezone'),
  avatarUrl: z.string().nullable().describe('Avatar URL'),
  externalId: z.string().nullable().describe('External reference ID')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve users from the Timely workspace. Includes roles, capacity, and rate information. Filter by status (active, archived, all).`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      show: z.enum(['active', 'all', 'archived']).optional().describe('Filter by user status'),
      limit: z.number().optional().describe('Max users to return'),
      offset: z.number().optional().describe('Offset for pagination'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema),
      count: z.number().describe('Number of users returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    let users = await client.listUsers({
      show: ctx.input.show,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      order: ctx.input.order
    });

    let mapped = users.map((u: any) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      active: u.active ?? true,
      role: u.user_level ?? u.role?.name ?? null,
      weeklyCapacity: u.weekly_capacity ?? null,
      defaultHourRate: u.default_hour_rate ?? null,
      timeZone: u.time_zone ?? null,
      avatarUrl: u.avatar?.large_retina ?? null,
      externalId: u.external_id ?? null
    }));

    return {
      output: { users: mapped, count: mapped.length },
      message: `Found **${mapped.length}** users.`
    };
  })
  .build();
