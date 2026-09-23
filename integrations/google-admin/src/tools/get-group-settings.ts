import { buildApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';
import { groupSettingsOutputSchema, mapGroupSettings } from './group-settings';

export let getGroupSettings = SlateTool.create(spec, {
  name: 'Get Group Settings',
  key: 'get_group_settings',
  description:
    "Read a Google Workspace group's access, posting, and moderation settings by its email address.",
  tags: { readOnly: true, destructive: false }
})
  .scopes(googleAdminActionScopes.getGroupSettings)
  .input(
    z.object({
      groupEmail: z.email().describe('Email address of the existing Workspace group')
    })
  )
  .output(groupSettingsOutputSchema)
  .handleInvocation(async ctx => {
    try {
      let client = new Client({
        token: ctx.auth.token,
        customerId: ctx.config.customerId,
        domain: ctx.config.domain
      });
      let settings = await client.getGroupSettings(ctx.input.groupEmail);
      return {
        output: mapGroupSettings(ctx.input.groupEmail, settings),
        message: `Retrieved settings for group **${ctx.input.groupEmail}**.`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Admin',
        operation: 'get group settings',
        reason: 'google_admin_api_error',
        nestedKeys: ['error', 'errors']
      });
    }
  })
  .build();
