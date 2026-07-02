import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users in the organization with their profiles, roles, timezones, and availability settings.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userUuid: z.string().describe('UUID of the user'),
            fullName: z.string().describe('Full name of the user'),
            email: z.string().optional().describe('Email address of the user'),
            role: z.string().optional().describe('Role of the user in the organization'),
            timezone: z.string().optional().describe('Timezone of the user'),
            isActive: z.boolean().optional().describe('Whether the user is active'),
            occupation: z.string().optional().describe('User occupation or job title')
          })
        )
        .describe('List of organization users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let users = await client.listUsers();

    let mapped = users.map((u: any) => ({
      userUuid: u.uuid,
      fullName: u.full_name ?? u.name ?? '',
      email: u.email,
      role: u.role,
      timezone: u.timezone,
      isActive: u.is_active,
      occupation: u.occupation
    }));

    return {
      output: { users: mapped },
      message: `Found **${mapped.length}** user(s).`
    };
  })
  .build();
