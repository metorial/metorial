import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe(
          'Service Access Token (SAT) or Personal Access Token (PAT) for Control Plane and Management APIs.'
        ),
      organizationAccessToken: z
        .string()
        .optional()
        .describe(
          'Optional organization-level Service Access Token with Admin permissions for Enterprise audit logs; other tools use the workspace token.'
        ),
      sourceWriteKey: z
        .string()
        .optional()
        .describe(
          'Source Write Key for the HTTP/Event API (Data Plane). Required only when sending events.'
        )
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',
    inputSchema: z.object({
      organizationAccessToken: z
        .string()
        .optional()
        .describe(
          'Optional organization-level Service Access Token with Admin permissions for Enterprise audit logs.'
        ),
      serviceAccessToken: z
        .string()
        .describe(
          'Service Access Token (SAT) or Personal Access Token (PAT). Found in the RudderStack dashboard under Settings > Access Tokens.'
        ),
      sourceWriteKey: z
        .string()
        .optional()
        .describe(
          'Source Write Key for sending events via the HTTP API. Found in the source settings in the RudderStack dashboard.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.serviceAccessToken.trim() || /[\r\n]/.test(ctx.input.serviceAccessToken))
        throw createApiServiceError(
          'Provide a valid workspace Service Access Token or Personal Access Token.'
        );
      if (
        ctx.input.organizationAccessToken !== undefined &&
        (!ctx.input.organizationAccessToken.trim() ||
          /[\r\n]/.test(ctx.input.organizationAccessToken))
      )
        throw createApiServiceError('Provide a valid organization access token.');
      return {
        output: {
          token: ctx.input.serviceAccessToken,
          organizationAccessToken: ctx.input.organizationAccessToken,
          sourceWriteKey: ctx.input.sourceWriteKey
        }
      };
    }
  });
