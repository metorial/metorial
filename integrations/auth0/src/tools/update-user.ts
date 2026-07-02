import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { spec } from '../spec';

export let updateUserTool = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update an existing user's profile, metadata, or account status. Can update email, password, profile fields, metadata, and blocked status.`,
  instructions: [
    'Only include fields you want to change. Omitted fields remain unchanged.',
    'Updating email or password may require specifying the connection and client_id.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('The Auth0 user ID to update'),
      email: z.string().optional().describe('New email address'),
      password: z.string().optional().describe('New password'),
      username: z.string().optional().describe('New username'),
      phoneNumber: z.string().optional().describe('New phone number'),
      name: z.string().optional().describe('New full name'),
      nickname: z.string().optional().describe('New nickname'),
      givenName: z.string().optional().describe('New given/first name'),
      familyName: z.string().optional().describe('New family/last name'),
      picture: z.string().optional().describe('New avatar URL'),
      userMetadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated user metadata (merged with existing)'),
      appMetadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated application metadata (merged with existing)'),
      blocked: z.boolean().optional().describe('Block or unblock the user'),
      emailVerified: z.boolean().optional().describe('Mark email as verified or unverified'),
      connection: z
        .string()
        .optional()
        .describe('Connection name (required when updating email/password)')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The updated user ID'),
      email: z.string().optional().describe('Updated email'),
      name: z.string().optional().describe('Updated name'),
      blocked: z.boolean().optional().describe('Updated blocked status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Auth0Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let user = await client.updateUser(ctx.input.userId, {
      email: ctx.input.email,
      password: ctx.input.password,
      username: ctx.input.username,
      phoneNumber: ctx.input.phoneNumber,
      name: ctx.input.name,
      nickname: ctx.input.nickname,
      givenName: ctx.input.givenName,
      familyName: ctx.input.familyName,
      picture: ctx.input.picture,
      userMetadata: ctx.input.userMetadata,
      appMetadata: ctx.input.appMetadata,
      blocked: ctx.input.blocked,
      emailVerified: ctx.input.emailVerified,
      connection: ctx.input.connection
    });

    return {
      output: {
        userId: user.user_id,
        email: user.email,
        name: user.name,
        blocked: user.blocked
      },
      message: `Updated user **${user.email || user.user_id}**.`
    };
  })
  .build();
