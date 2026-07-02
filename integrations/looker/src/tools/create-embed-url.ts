import { SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

export let createEmbedUrl = SlateTool.create(spec, {
  name: 'Create Embed URL',
  key: 'create_embed_url',
  description: `Generate a signed SSO embed URL for embedding Looker content (dashboards, Looks, Explores) into external applications. The URL can be used to embed Looker in iframes with authenticated user context.`
})
  .input(
    z.object({
      targetUrl: z
        .string()
        .describe('The Looker URL to embed (e.g., "/embed/dashboards/1" or "/embed/looks/5")'),
      externalUserId: z.string().describe('External user ID for the embed user'),
      permissions: z
        .array(z.string())
        .describe(
          'Permissions for the embed user (e.g., ["access_data", "see_looks", "see_user_dashboards"])'
        ),
      models: z.array(z.string()).describe('Models the embed user can access'),
      sessionLength: z
        .number()
        .optional()
        .describe('Session length in seconds (default 3600)'),
      firstName: z.string().optional().describe('First name of the embed user'),
      lastName: z.string().optional().describe('Last name of the embed user'),
      forceLogoutLogin: z.boolean().optional().describe('Whether to force logout/login'),
      groupIds: z
        .array(z.string())
        .optional()
        .describe('Group IDs to assign to the embed user'),
      externalGroupId: z.string().optional().describe('External group ID'),
      userAttributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('User attributes for the embed user')
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

    let result = await client.createSsoEmbedUrl({
      target_url: ctx.input.targetUrl,
      session_length: ctx.input.sessionLength || 3600,
      force_logout_login: ctx.input.forceLogoutLogin,
      external_user_id: ctx.input.externalUserId,
      first_name: ctx.input.firstName,
      last_name: ctx.input.lastName,
      permissions: ctx.input.permissions,
      models: ctx.input.models,
      group_ids: ctx.input.groupIds,
      external_group_id: ctx.input.externalGroupId,
      user_attributes: ctx.input.userAttributes
    });

    return {
      output: { url: result.url },
      message: `Generated embed URL for **${ctx.input.targetUrl}** (user: ${ctx.input.externalUserId}).`
    };
  })
  .build();
