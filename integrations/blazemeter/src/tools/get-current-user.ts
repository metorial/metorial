import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BlazeMeterClient } from '../lib/client';
import { RunscopeClient } from '../lib/runscope-client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the authenticated BlazeMeter user or API Monitoring account. For API Monitoring, returns team UUIDs needed to create monitoring buckets.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Authenticated user or account identifier'),
      name: z.string().optional().describe('User display name'),
      email: z.string().optional().describe('Email address when available to the connection'),
      connectionType: z.enum(['api_key', 'runscope_oauth']).describe('Connection type'),
      teams: z
        .array(
          z.object({
            teamUuid: z.string().describe('Team UUID to pass to manage_bucket'),
            name: z.string().describe('Team name')
          })
        )
        .optional()
        .describe('API Monitoring teams available to the account')
    })
  )
  .handleInvocation(async ctx => {
    let legacyBasicToken =
      Buffer.from(ctx.auth.token, 'base64').toString('base64') === ctx.auth.token &&
      Buffer.from(ctx.auth.token, 'base64').toString().includes(':');
    if (
      ctx.auth.runscopeToken ||
      (!ctx.auth.apiKeyId && !ctx.auth.apiKeySecret && !legacyBasicToken)
    ) {
      // Legacy OAuth connections stored only token; API key connections also include key fields or a Basic token.
      let account = await new RunscopeClient({
        token: ctx.auth.runscopeToken || ctx.auth.token
      }).getAccount();
      if (!account?.uuid) {
        throw createApiServiceError(
          'API Monitoring did not return an authenticated account UUID.'
        );
      }
      return {
        output: {
          userId: String(account.uuid),
          name: account.name ?? undefined,
          email: account.email ?? undefined,
          connectionType: 'runscope_oauth' as const,
          teams: (account.teams ?? []).map((team: { uuid: string; name: string }) => ({
            teamUuid: team.uuid,
            name: team.name
          }))
        },
        message: 'Retrieved the authenticated API Monitoring account and teams.'
      };
    }

    let user = await new BlazeMeterClient(ctx.auth).getCurrentUser();
    if (user?.id === undefined || user?.id === null) {
      throw createApiServiceError('BlazeMeter did not return an authenticated user ID.');
    }
    return {
      output: {
        userId: String(user.id),
        name:
          user.displayName ??
          ([user.firstName, user.lastName].filter(Boolean).join(' ') || undefined),
        email: user.email ?? undefined,
        connectionType: 'api_key' as const
      },
      message: 'Retrieved the authenticated BlazeMeter user.'
    };
  })
  .build();
