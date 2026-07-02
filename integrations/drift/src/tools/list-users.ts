import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users (agents) in the Drift organization. Returns the full list of users with their availability, role, and contact information. Can optionally retrieve a single user by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('Specific user ID to retrieve (omit to list all)')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.number().describe('Drift user ID'),
          name: z.string().optional().describe('Full name'),
          email: z.string().optional().describe('Email address'),
          alias: z.string().optional().describe('Display alias'),
          phone: z.string().optional().describe('Phone number'),
          role: z.string().optional().describe('Role: member, admin, or agent'),
          availability: z
            .string()
            .optional()
            .describe('Current availability: AVAILABLE, OFFLINE, or ON_CALL'),
          isBot: z.boolean().optional().describe('Whether the user is a bot'),
          verified: z.boolean().optional().describe('Whether the account is verified'),
          avatarUrl: z.string().optional().describe('Profile image URL'),
          timeZone: z.string().optional().describe('User timezone'),
          createdAt: z.number().optional().describe('Unix timestamp of creation')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriftClient(ctx.auth.token);

    let users: any[];

    if (ctx.input.userId) {
      let user = await client.getUser(ctx.input.userId);
      users = user ? [user] : [];
    } else {
      users = await client.listUsers();
    }

    return {
      output: {
        users: users.map((u: any) => ({
          userId: u.id,
          name: u.name,
          email: u.email,
          alias: u.alias,
          phone: u.phone,
          role: u.role,
          availability: u.availability,
          isBot: u.bot,
          verified: u.verified,
          avatarUrl: u.avatarUrl,
          timeZone: u.timeZone,
          createdAt: u.createdAt
        }))
      },
      message: ctx.input.userId
        ? `Retrieved user \`${ctx.input.userId}\`.`
        : `Retrieved **${users.length}** user(s).`
    };
  })
  .build();
