import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Get detailed profile information for a specific user by their user ID or email address. Use "me" as the identifier to get the authenticated user's profile.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().optional().describe('User ID to look up'),
      email: z.string().optional().describe('Email address to look up'),
      includeCustomProfileFields: z
        .boolean()
        .optional()
        .describe('Whether to include custom profile field data')
    })
  )
  .output(
    z.object({
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
      dateJoined: z.string().optional().describe('ISO date string when the user joined'),
      customProfileFields: z
        .array(z.any())
        .optional()
        .describe('Custom profile field values if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.auth.serverUrl,
      email: ctx.auth.email,
      token: ctx.auth.token
    });

    let user: any;

    if (ctx.input.userId !== undefined) {
      let result = await client.getUserById(ctx.input.userId, {
        includeCustomProfileFields: ctx.input.includeCustomProfileFields
      });
      user = result.user;
    } else if (ctx.input.email) {
      let result = await client.getUserByEmail(ctx.input.email, {
        includeCustomProfileFields: ctx.input.includeCustomProfileFields
      });
      user = result.user;
    } else {
      user = await client.getOwnUser();
    }

    return {
      output: {
        userId: user.user_id,
        email: user.email,
        fullName: user.full_name,
        isBot: user.is_bot,
        isActive: user.is_active,
        role: user.role,
        avatarUrl: user.avatar_url,
        timezone: user.timezone,
        dateJoined: user.date_joined,
        customProfileFields: user.profile_data ? Object.values(user.profile_data) : undefined
      },
      message: `User: **${user.full_name}** (${user.email})`
    };
  })
  .build();
