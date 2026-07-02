import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateApiSettings = SlateTool.create(spec, {
  name: 'Update API Settings',
  key: 'update_api_settings',
  description: `Update settings for an API in SwaggerHub. Supports changing the default version, publishing/unpublishing a version, setting visibility (public/private), and renaming the API. Multiple settings can be updated in a single call.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z
        .string()
        .optional()
        .describe('API owner (username or organization). Falls back to config owner.'),
      apiName: z.string().describe('Name of the API'),
      version: z
        .string()
        .optional()
        .describe('Version to update settings for (required for publish/visibility changes)'),
      defaultVersion: z
        .string()
        .optional()
        .describe('Set this as the default version of the API'),
      published: z
        .boolean()
        .optional()
        .describe('Publish (true) or unpublish (false) the specified version'),
      isPrivate: z
        .boolean()
        .optional()
        .describe('Make the version private (true) or public (false)'),
      newName: z.string().optional().describe('Rename the API to this new name')
    })
  )
  .output(
    z.object({
      owner: z.string().describe('API owner'),
      apiName: z.string().describe('API name (updated if renamed)'),
      updatedSettings: z.array(z.string()).describe('List of settings that were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let owner = ctx.input.owner || ctx.config.owner;
    if (!owner)
      throw new Error(
        'Owner is required. Provide it in the input or configure a default owner.'
      );

    let updatedSettings: string[] = [];
    let apiName = ctx.input.apiName;

    if (ctx.input.defaultVersion !== undefined) {
      await client.setApiDefaultVersion(owner, apiName, ctx.input.defaultVersion);
      updatedSettings.push(`defaultVersion → ${ctx.input.defaultVersion}`);
    }

    if (ctx.input.published !== undefined) {
      if (!ctx.input.version)
        throw new Error('Version is required to change published status.');
      await client.setApiVersionLifecycle(
        owner,
        apiName,
        ctx.input.version,
        ctx.input.published
      );
      updatedSettings.push(`published → ${ctx.input.published}`);
    }

    if (ctx.input.isPrivate !== undefined) {
      if (!ctx.input.version) throw new Error('Version is required to change visibility.');
      await client.setApiVersionVisibility(
        owner,
        apiName,
        ctx.input.version,
        ctx.input.isPrivate
      );
      updatedSettings.push(`private → ${ctx.input.isPrivate}`);
    }

    if (ctx.input.newName) {
      await client.renameApi(owner, apiName, ctx.input.newName);
      apiName = ctx.input.newName;
      updatedSettings.push(`renamed → ${ctx.input.newName}`);
    }

    return {
      output: {
        owner,
        apiName,
        updatedSettings
      },
      message:
        updatedSettings.length > 0
          ? `Updated settings for **${owner}/${apiName}**: ${updatedSettings.join(', ')}.`
          : 'No settings were changed.'
    };
  })
  .build();
