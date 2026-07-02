import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.number().describe('Unique user ID'),
  email: z.string().describe('User email address'),
  fullName: z.string().describe('Full display name'),
  isBot: z.boolean().describe('Whether the user is a bot'),
  isActive: z.boolean().describe('Whether the user account is active'),
  role: z
    .number()
    .describe(
      'User role: 100=Organization owner, 200=Administrator, 300=Moderator, 400=Member, 600=Guest'
    ),
  avatarUrl: z.string().nullable().optional().describe('URL of the user avatar'),
  timezone: z.string().optional().describe('User timezone'),
  dateJoined: z.string().optional().describe('ISO date string when the user joined')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users in the Zulip organization, including their roles, status, and profile information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includeCustomProfileFields: z
        .boolean()
        .optional()
        .describe('Whether to include custom profile field data. Defaults to false')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of users in the organization')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.auth.serverUrl,
      email: ctx.auth.email,
      token: ctx.auth.token
    });

    let result = await client.getUsers({
      includeCustomProfileFields: ctx.input.includeCustomProfileFields
    });

    let users = (result.members || []).map((u: any) => ({
      userId: u.user_id,
      email: u.email,
      fullName: u.full_name,
      isBot: u.is_bot,
      isActive: u.is_active,
      role: u.role,
      avatarUrl: u.avatar_url,
      timezone: u.timezone,
      dateJoined: u.date_joined
    }));

    return {
      output: { users },
      message: `Found ${users.length} user(s)`
    };
  })
  .build();
