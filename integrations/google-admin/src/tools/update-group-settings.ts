import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';
import {
  groupSettingsOutputSchema,
  groupSettingsPatchSchema,
  mapGroupSettings
} from './group-settings';

export let updateGroupSettings = SlateTool.create(spec, {
  name: 'Update Group Settings',
  key: 'update_group_settings',
  description:
    'Change selected access, posting, or moderation settings of an existing Google Workspace group.',
  instructions: [
    'Only supplied settings are changed. Use get_group_settings to inspect the current values first.',
    'Workspace policies may restrict which settings an administrator can change.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .scopes(googleAdminActionScopes.updateGroupSettings)
  .input(
    z.object({
      groupEmail: z.email().describe('Email address of the existing Workspace group'),
      settings: groupSettingsPatchSchema.describe(
        'Settings to change; supply at least one field'
      )
    })
  )
  .output(groupSettingsOutputSchema)
  .handleInvocation(async ctx => {
    try {
      let patch = Object.fromEntries(
        Object.entries(ctx.input.settings)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
      );
      if (Object.keys(patch).length === 0) {
        throw createApiServiceError('Supply at least one group setting to update.');
      }

      let client = new Client({
        token: ctx.auth.token,
        customerId: ctx.config.customerId,
        domain: ctx.config.domain
      });
      let settings = await client.updateGroupSettings(ctx.input.groupEmail, patch);
      return {
        output: mapGroupSettings(ctx.input.groupEmail, settings),
        message: `Updated settings for group **${ctx.input.groupEmail}**.`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Admin',
        operation: 'update group settings',
        reason: 'google_admin_api_error',
        nestedKeys: ['error', 'errors']
      });
    }
  })
  .build();
