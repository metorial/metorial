import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getProfile = SlateTool.create(spec, {
  key: 'get_profile',
  name: 'Get Profile',
  description: 'Identify the connected Copper account and the current API user.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.number().describe('Connected account ID'),
      accountName: z.string().describe('Connected account name'),
      userId: z.number().describe('User who owns the API key or OAuth connection'),
      userName: z.string().describe('Current user name'),
      email: z.string().describe('Current user email address'),
      timezone: z.string().optional().describe('Account primary timezone'),
      authMethod: z.enum(['api_key', 'oauth']).describe('Connection authentication method')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth);
    const account = await client.getAccount();
    const user = await client.getApiUser();
    if (
      typeof account.name !== 'string' ||
      typeof user.name !== 'string' ||
      typeof user.email !== 'string'
    )
      throw createApiServiceError('Copper returned incomplete account or user identity.');
    return {
      output: {
        accountId: account.id,
        accountName: account.name,
        userId: user.id,
        userName: user.name,
        email: user.email,
        timezone:
          typeof account.primary_timezone === 'string' ? account.primary_timezone : undefined,
        authMethod: ctx.auth.authMethod
      },
      message: `Identified Copper account ${account.id} and API user ${user.id}.`
    };
  })
  .build();
