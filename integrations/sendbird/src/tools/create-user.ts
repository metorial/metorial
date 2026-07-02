import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new user in your Sendbird application. Optionally issue an access token or session token for client-side authentication, and attach metadata to the user profile.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('Unique ID for the new user'),
      nickname: z.string().describe('Display name for the user'),
      profileUrl: z.string().optional().describe('URL of the user profile image'),
      issueAccessToken: z
        .boolean()
        .optional()
        .describe('Whether to issue an access token for the user'),
      issueSessionToken: z
        .boolean()
        .optional()
        .describe('Whether to issue a session token for the user'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value metadata to attach to the user')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Unique ID of the created user'),
      nickname: z.string().describe('Display name of the user'),
      profileUrl: z.string().describe('Profile image URL'),
      accessToken: z.string().optional().describe('Issued access token, if requested'),
      isActive: z.boolean().describe('Whether the user is active'),
      createdAt: z.number().describe('Unix timestamp of creation'),
      metadata: z.record(z.string(), z.string()).optional().describe('User metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });

    let result = await client.createUser({
      userId: ctx.input.userId,
      nickname: ctx.input.nickname,
      profileUrl: ctx.input.profileUrl,
      issueAccessToken: ctx.input.issueAccessToken,
      issueSessionToken: ctx.input.issueSessionToken,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        userId: result.user_id,
        nickname: result.nickname,
        profileUrl: result.profile_url ?? '',
        accessToken: result.access_token,
        isActive: result.is_active ?? true,
        createdAt: result.created_at ?? 0,
        metadata: result.metadata
      },
      message: `Created user **${result.nickname}** (${result.user_id}).`
    };
  })
  .build();
