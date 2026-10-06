import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { accountClient, resolvedDeployment } from '../lib/client';
import { protect } from '../lib/validation';
import { spec } from '../spec';
export const getConnectionContext = SlateTool.create(spec, {
  key: 'get_connection_context',
  name: 'Get Connection Context',
  description:
    'Inspect the current Epic Account token through its documented verification endpoint, or read EOS game-service context observed at the token grant. EOS grant metadata does not identify a player or prove current permissions.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      service: z.enum(['epic_account', 'eos_game']),
      evidence: z.enum(['token_info', 'token_grant', 'saved_context']),
      active: z.boolean().optional(),
      accountId: z.string().optional(),
      clientId: z
        .string()
        .optional()
        .describe('Configured EOS client or native EAS verified client.'),
      clientIdSource: z.enum(['configured', 'token_info']).optional(),
      deploymentSource: z.enum(['token_grant', 'auth_request', 'legacy_config']).optional(),
      applicationId: z.string().optional(),
      deploymentId: z.string().optional(),
      sandboxId: z.string().optional(),
      organizationId: z.string().optional(),
      productId: z.string().optional(),
      features: z.array(z.string()).optional(),
      grantedScope: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.auth.authType === 'oauth') {
      const data = await accountClient(ctx).getTokenInfo();
      return {
        output: {
          service: 'epic_account' as const,
          evidence: 'token_info' as const,
          clientIdSource: 'token_info' as const,
          active: data.active,
          accountId: data.account_id,
          clientId: data.client_id,
          applicationId: data.application_id,
          grantedScope: data.scope,
          expiresAt: data.expires_at,
          deploymentId: resolvedDeployment(ctx)
        },
        message: 'Returned the currently verified Epic Account token context.'
      };
    }
    if (ctx.auth.authType !== 'client_credentials')
      throw createApiServiceError(
        'Reconnect with an Epic Account or EOS Game Services auth method; the saved credential family is missing.'
      );
    const output = {
      service: 'eos_game' as const,
      evidence: ctx.auth.grantObserved ? ('token_grant' as const) : ('saved_context' as const),
      clientIdSource: 'configured' as const,
      deploymentSource: ctx.auth.deploymentObserved
        ? ('token_grant' as const)
        : ctx.auth.deploymentId
          ? ('auth_request' as const)
          : ('legacy_config' as const),
      clientId: ctx.auth.clientId,
      deploymentId: resolvedDeployment(ctx),
      sandboxId: ctx.auth.sandboxId,
      organizationId: ctx.auth.organizationId,
      productId: ctx.auth.productId,
      features: ctx.auth.features,
      expiresAt: ctx.auth.expiresAt
    };
    protect(output, [ctx.auth.token, ctx.auth.refreshToken ?? '']);
    return {
      output,
      message:
        'Returned EOS client context observed when the token was issued. This is not current introspection or a player identity; legacy saved grants may omit native metadata.'
    };
  })
  .build();
