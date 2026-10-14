import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List a page of users in the organization with their profiles, roles, timezones, and availability settings. Use page to retrieve further results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number, starting at 1'),
      pageSize: z.number().optional().describe('Users per page; default 20, maximum 100'),
      search: z.string().optional().describe('Search by name, email, or external ID'),
      onlyActive: z.boolean().optional().describe('Filter to active users'),
      includeEmail: z.boolean().optional().describe('Request email addresses when permitted')
    })
  )
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
        .describe('List of organization users'),
      count: z.number().optional().describe('Total number of matching users'),
      next: z.string().nullable().optional().describe('URL of the next page, or null'),
      previous: z.string().nullable().optional().describe('URL of the previous page, or null')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let result = await client.listUsers(ctx.input);
    let users = result?.results ?? result;

    let mapped = users.map((u: any) => ({
      userUuid: u.uuid,
      fullName: u.full_name ?? u.name ?? [u.first_name, u.last_name].filter(Boolean).join(' '),
      email: u.email,
      role: u.role,
      timezone: u.timezone,
      isActive: u.is_active,
      occupation: u.occupation
    }));

    return {
      output: {
        users: mapped,
        count: result?.count,
        next: result?.next,
        previous: result?.previous
      },
      message: `Found **${mapped.length}** user(s).`
    };
  })
  .build();
