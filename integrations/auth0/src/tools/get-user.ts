import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { spec } from '../spec';

export let getUserTool = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a single user by their ID. Returns the full user profile including metadata, identities, roles, and permissions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('The Auth0 user ID (e.g., "auth0|507f1f77bcf86cd799439020")')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The Auth0 user ID'),
      email: z.string().optional().describe('User email address'),
      name: z.string().optional().describe('User full name'),
      nickname: z.string().optional().describe('User nickname'),
      picture: z.string().optional().describe('URL to user avatar'),
      connection: z.string().optional().describe('Primary connection name'),
      emailVerified: z.boolean().optional().describe('Whether email is verified'),
      blocked: z.boolean().optional().describe('Whether user is blocked'),
      createdAt: z.string().optional().describe('User creation timestamp'),
      lastLogin: z.string().optional().describe('Last login timestamp'),
      loginsCount: z.number().optional().describe('Total number of logins'),
      userMetadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom user metadata'),
      appMetadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom application metadata'),
      identities: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Linked identity provider accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Auth0Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let user = await client.getUser(ctx.input.userId);

    return {
      output: {
        userId: user.user_id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        picture: user.picture,
        connection: user.identities?.[0]?.connection,
        emailVerified: user.email_verified,
        blocked: user.blocked,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        loginsCount: user.logins_count,
        userMetadata: user.user_metadata,
        appMetadata: user.app_metadata,
        identities: user.identities
      },
      message: `Retrieved user **${user.name || user.email || user.user_id}**.`
    };
  })
  .build();
