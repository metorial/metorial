import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

let normalizeTargetUrl = (targetUrl: string, instanceUrl: string) => {
  try {
    let normalized = targetUrl.startsWith('/')
      ? new URL(targetUrl, instanceUrl)
      : new URL(targetUrl);
    if (normalized.protocol !== 'https:') throw new TypeError('Unsupported protocol');
    return normalized.toString();
  } catch {
    throw createApiServiceError(
      'targetUrl must be a complete HTTPS URL or a root-relative Looker path.',
      { reason: 'looker_create_embed_url_target_invalid' }
    );
  }
};

export let createEmbedUrl = SlateTool.create(spec, {
  name: 'Create Embed URL',
  key: 'create_embed_url',
  description: `Generate a signed SSO embed URL for embedding Looker content (dashboards, Looks, Explores) into external applications. The URL can be used to embed Looker in iframes with authenticated user context.`
})
  .input(
    z.object({
      targetUrl: z
        .string()
        .min(1)
        .describe(
          'Complete public HTTPS URL of the Looker page to embed, or a legacy root-relative Looker path such as /embed/dashboards/1'
        ),
      externalUserId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Stable external user ID. Reusing it terminates the existing session and replaces its access grants.'
        ),
      permissions: z
        .array(z.string().min(1))
        .optional()
        .describe(
          'Looker permissions granted directly to the embed user. Required with models unless non-empty groupIds are provided.'
        ),
      models: z
        .array(z.string().min(1))
        .optional()
        .describe(
          'LookML models granted directly to the embed user. Required with permissions unless non-empty groupIds are provided.'
        ),
      sessionLength: z
        .number()
        .int()
        .min(0)
        .max(2592000)
        .optional()
        .describe(
          'Session lifetime in seconds; defaults to 3600 and cannot exceed 2592000 (30 days)'
        ),
      firstName: z.string().optional().describe('First name of the embed user'),
      lastName: z.string().optional().describe('Last name of the embed user'),
      userTimezone: z
        .string()
        .min(1)
        .nullable()
        .optional()
        .describe(
          "IANA timezone for the embed session; null uses Looker's application default. Omit when user-specific timezones are disabled."
        ),
      forceLogoutLogin: z
        .boolean()
        .optional()
        .describe(
          'Whether to purge residual Looker login state before creating the embed login; defaults to true'
        ),
      groupIds: z
        .array(z.string().min(1))
        .optional()
        .describe(
          'Looker group IDs whose grants are added to the direct models and permissions grants'
        ),
      externalGroupId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Stable ID for an embed-exclusive content-sharing group; users with the same value can share content with each other'
        ),
      userAttributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Looker user attribute names mapped to their values'),
      secretId: z
        .string()
        .min(1)
        .optional()
        .describe('Active embed secret ID to sign with; defaults to the newest active secret'),
      embedDomain: z
        .string()
        .url()
        .optional()
        .describe(
          'URL of the domain hosting the embed; Looker adds a valid missing domain to its allowlist'
        )
    })
  )
  .output(
    z.object({
      url: z.string().describe('Signed embed URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let hasGroups = (ctx.input.groupIds?.length ?? 0) > 0;
    let hasDirectGrants =
      (ctx.input.permissions?.length ?? 0) > 0 && (ctx.input.models?.length ?? 0) > 0;
    if (!hasGroups && !hasDirectGrants) {
      throw createApiServiceError(
        'Provide at least one groupId, or provide both non-empty permissions and models.',
        { reason: 'looker_create_embed_url_missing_access_grants' }
      );
    }

    let targetUrl = normalizeTargetUrl(ctx.input.targetUrl, ctx.config.instanceUrl);

    let result = await client.createSsoEmbedUrl({
      target_url: targetUrl,
      session_length: ctx.input.sessionLength ?? 3600,
      force_logout_login: ctx.input.forceLogoutLogin,
      external_user_id: ctx.input.externalUserId,
      first_name: ctx.input.firstName,
      last_name: ctx.input.lastName,
      user_timezone: ctx.input.userTimezone,
      permissions: ctx.input.permissions,
      models: ctx.input.models,
      group_ids: ctx.input.groupIds,
      external_group_id: ctx.input.externalGroupId,
      user_attributes: ctx.input.userAttributes,
      secret_id: ctx.input.secretId,
      embed_domain: ctx.input.embedDomain
    });

    if (typeof result?.url !== 'string' || result.url.length === 0) {
      throw createApiServiceError('Looker returned an invalid signed embed URL response.', {
        reason: 'looker_create_embed_url_invalid_response'
      });
    }

    return {
      output: { url: result.url },
      message: `Generated embed URL for **${targetUrl}**${ctx.input.externalUserId ? ` (user: ${ctx.input.externalUserId})` : ''}.`
    };
  })
  .build();
