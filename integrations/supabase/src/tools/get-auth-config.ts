import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { requireProjectRef } from '../lib/errors';
import { spec } from '../spec';

export let getAuthConfig = SlateTool.create(spec, {
  name: 'Get Auth Config',
  key: 'get_auth_config',
  description: `Retrieve or update the authentication configuration for a Supabase project. This includes settings for email auth, phone auth, external OAuth providers, JWT configuration, and MFA policies.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectRef: z
        .string()
        .optional()
        .describe('Project reference ID (uses config.projectRef if not provided)'),
      action: z.enum(['get', 'update']).describe('Action to perform'),
      settings: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Auth settings to update (for update action). Uses Supabase Auth config field names.'
        )
    })
  )
  .output(
    z.object({
      authConfig: z.record(z.string(), z.any()).describe('Current auth configuration settings')
    })
  )
  .handleInvocation(async ctx => {
    let projectRef = requireProjectRef(ctx.input.projectRef ?? ctx.config.projectRef);

    let client = new ManagementClient(ctx.auth.token);

    if (ctx.input.action === 'update') {
      if (!ctx.input.settings) {
        throw createApiServiceError('settings are required for update action');
      }
      let result = await client.updateAuthConfig(projectRef, ctx.input.settings);
      return {
        output: { authConfig: result ?? {} },
        message: `Updated auth configuration for project **${projectRef}**.`
      };
    }

    let config = await client.getAuthConfig(projectRef);
    return {
      output: { authConfig: config ?? {} },
      message: `Retrieved auth configuration for project **${projectRef}**.`
    };
  })
  .build();
