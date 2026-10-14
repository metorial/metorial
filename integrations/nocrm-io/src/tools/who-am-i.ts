import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Who Am I',
  key: 'who_am_i',
  description:
    'Verify the connection and return its noCRM.io account subdomain and authentication type. Email/password connections also return the signed-in user profile. API-key connections identify the account and do not identify a specific signed-in user.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accountSubdomain: z.string().describe('Account subdomain verified with this connection'),
      authenticationType: z.enum(['api_key', 'user_token']),
      user: z
        .object({
          userId: z.number(),
          email: z.string(),
          firstname: z.string().optional(),
          lastname: z.string().optional(),
          isAdmin: z.boolean().optional(),
          isDisabled: z.boolean().optional(),
          hasActivated: z.boolean().optional(),
          locale: z.string().optional(),
          timeZone: z.string().optional(),
          permalink: z.string().optional()
        })
        .optional()
        .describe('Signed-in user profile for an email/password connection')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);
    if (client.tokenType === 'user_token' && ctx.auth.userId === undefined) {
      throw createApiServiceError(
        'Reconnect with email and password to resolve the signed-in user.'
      );
    }
    await client.ping();
    let user =
      client.tokenType === 'user_token' && ctx.auth.userId !== undefined
        ? await client.getUser(ctx.auth.userId)
        : undefined;
    return {
      output: {
        accountSubdomain: client.subdomain,
        authenticationType: client.tokenType,
        user: user
          ? {
              userId: user.id,
              email: user.email,
              firstname: user.firstname ?? undefined,
              lastname: user.lastname ?? undefined,
              isAdmin: user.is_admin ?? undefined,
              isDisabled: user.is_disabled ?? undefined,
              hasActivated: user.has_activated ?? undefined,
              locale: user.locale ?? undefined,
              timeZone: user.time_zone ?? undefined,
              permalink: user.permalink ?? undefined
            }
          : undefined
      },
      message: user
        ? `Authenticated as ${user.email} in account ${client.subdomain}.`
        : `Verified API-key access to account ${client.subdomain}.`
    };
  })
  .build();
