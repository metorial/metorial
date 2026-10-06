import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { legacyBaseUrl, TravisCIClient } from '../lib/client';
import type { Setting } from '../lib/types';
import { spec } from '../spec';

const settingNames = z.enum([
  'builds_only_with_travis_yml',
  'build_pushes',
  'build_pull_requests',
  'maximum_number_of_builds',
  'auto_cancel_pushes',
  'auto_cancel_pull_requests',
  'share_encrypted_env_with_forks',
  'share_ssh_keys_with_forks',
  'job_log_time_based_limit',
  'job_log_access_based_limit'
]);
const setting = z.object({
  name: z.string(),
  value: z.union([z.boolean(), z.number().int()])
});
export const manageRepositorySettings = SlateTool.create(spec, {
  name: 'Manage Repository Settings',
  key: 'manage_repository_settings',
  description: 'List, read, or update Travis CI repository build and log settings.',
  instructions: [
    'Use list to discover current settings. Changes affect future CI activity; confirm the repository and desired policy before updating.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      repoSlugOrId: z.string().describe('Repository slug or numeric ID'),
      action: z.enum(['list', 'get', 'update']),
      settingName: settingNames.optional().describe('Required for get and update'),
      value: z
        .union([z.boolean(), z.number().int()])
        .optional()
        .describe(
          'Required for update: integer for maximum_number_of_builds, boolean for other settings'
        )
    })
  )
  .output(z.object({ settings: z.array(setting).optional(), setting: setting.optional() }))
  .handleInvocation(async ctx => {
    const client = new TravisCIClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? legacyBaseUrl(ctx.config)
    });
    if (ctx.input.action === 'list') {
      const result = await client.listSettings(ctx.input.repoSlugOrId);
      return {
        output: {
          settings: result.settings.map(item => ({ name: item.name, value: item.value }))
        },
        message: `Retrieved repository settings.`
      };
    }
    if (!ctx.input.settingName)
      throw createApiServiceError('settingName is required for get and update.');
    const name = ctx.input.settingName;
    let result: Setting;
    if (ctx.input.action === 'get')
      result = await client.getSetting(ctx.input.repoSlugOrId, name);
    else {
      const value = ctx.input.value;
      if (value === undefined) throw createApiServiceError('value is required for update.');
      if (
        name === 'maximum_number_of_builds'
          ? typeof value !== 'number'
          : typeof value !== 'boolean'
      )
        throw createApiServiceError(
          'Use an integer for maximum_number_of_builds and a boolean for other settings.'
        );
      result = await client.updateSetting(ctx.input.repoSlugOrId, name, value);
    }
    return {
      output: { setting: { name: result.name, value: result.value } },
      message: `Read current **${result.name}** setting: **${result.value}**.`
    };
  })
  .build();
