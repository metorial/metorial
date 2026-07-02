import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { spec } from '../spec';

export let createUserTool = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new user in Auth0. The user will be created in the specified connection (e.g., "Username-Password-Authentication"). Depending on the connection type, different fields may be required.`,
  instructions: [
    'For database connections, email and password are required.',
    'For passwordless connections, either email or phoneNumber is required.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      connection: z
        .string()
        .describe('Connection name for the user (e.g., "Username-Password-Authentication")'),
      email: z.string().optional().describe('User email address'),
      password: z
        .string()
        .optional()
        .describe('User password (required for database connections)'),
      username: z.string().optional().describe('Username'),
      phoneNumber: z.string().optional().describe('Phone number (for SMS connections)'),
      name: z.string().optional().describe('Full name'),
      nickname: z.string().optional().describe('Nickname'),
      picture: z.string().optional().describe('URL to user avatar'),
      userMetadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom user metadata (non-sensitive, editable by user)'),
      appMetadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom application metadata (admin-controlled)'),
      emailVerified: z.boolean().optional().describe('Mark email as verified'),
      verifyEmail: z.boolean().optional().describe('Send a verification email'),
      blocked: z.boolean().optional().describe('Block the user')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The created user ID'),
      email: z.string().optional().describe('User email address'),
      name: z.string().optional().describe('User full name'),
      connection: z.string().optional().describe('Connection name'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Auth0Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let user = await client.createUser({
      connection: ctx.input.connection,
      email: ctx.input.email,
      password: ctx.input.password,
      username: ctx.input.username,
      phoneNumber: ctx.input.phoneNumber,
      userMetadata: ctx.input.userMetadata,
      appMetadata: ctx.input.appMetadata,
      emailVerified: ctx.input.emailVerified,
      verifyEmail: ctx.input.verifyEmail,
      blocked: ctx.input.blocked
    });

    return {
      output: {
        userId: user.user_id,
        email: user.email,
        name: user.name,
        connection: user.identities?.[0]?.connection,
        createdAt: user.created_at
      },
      message: `Created user **${user.email || user.user_id}** in connection "${ctx.input.connection}".`
    };
  })
  .build();
