import { SlateTool } from 'slates';
import { z } from 'zod';
import { ArmClient } from '../lib/client';
import { spec } from '../spec';

export let manageAppSettings = SlateTool.create(spec, {
  name: 'Manage App Settings',
  key: 'manage_app_settings',
  description: `List or update application settings (environment variables) for an Azure Function App. When updating, you can add new settings, modify existing ones, or remove settings by setting their value to null. Existing settings not included in the update payload are preserved.`,
  instructions: [
    'Use action "list" to retrieve all current app settings.',
    'Use action "update" with the settings parameter to add or modify settings.',
    'To remove a setting, include it in the update with a null value.',
    'The update merges with existing settings — unspecified settings remain unchanged.'
  ],
  constraints: ['Updating app settings triggers an app restart.']
})
  .input(
    z.object({
      appName: z.string().describe('Name of the function app'),
      action: z.enum(['list', 'update']).describe('Whether to list or update settings'),
      settings: z
        .record(z.string(), z.string().nullable())
        .optional()
        .describe(
          'Settings to add/update. Set value to null to remove a setting. Required for update action.'
        )
    })
  )
  .output(
    z.object({
      settings: z
        .record(z.string(), z.string())
        .describe('Current application settings after the operation'),
      count: z.number().describe('Number of settings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ArmClient({
      token: ctx.auth.token,
      subscriptionId: ctx.config.subscriptionId,
      resourceGroupName: ctx.config.resourceGroupName
    });

    let { appName, action, settings: inputSettings } = ctx.input;
    ctx.info(`${action} app settings for ${appName}`);

    if (action === 'list') {
      let result = await client.listApplicationSettings(appName);
      let settings = result.properties || {};

      return {
        output: { settings, count: Object.keys(settings).length },
        message: `Found **${Object.keys(settings).length}** app setting(s) for **${appName}**.`
      };
    }

    // update action
    if (!inputSettings) {
      throw new Error('settings parameter is required for the update action');
    }

    // Fetch existing settings to merge
    let existingResult = await client.listApplicationSettings(appName);
    let existing: Record<string, string> = existingResult.properties || {};

    // Merge: add/update settings, remove nulls
    let merged: Record<string, string> = { ...existing };
    for (let [key, value] of Object.entries(inputSettings)) {
      if (value === null) {
        delete merged[key];
      } else {
        merged[key] = value;
      }
    }

    let result = await client.updateApplicationSettings(appName, merged);
    let finalSettings = result.properties || {};

    let addedOrUpdated = Object.keys(inputSettings).filter(
      k => inputSettings[k] !== null && inputSettings[k] !== undefined
    );
    let removed = Object.keys(inputSettings).filter(k => inputSettings[k] === null);

    return {
      output: { settings: finalSettings, count: Object.keys(finalSettings).length },
      message: `Updated app settings for **${appName}**.${addedOrUpdated.length > 0 ? `\n- Added/updated: ${addedOrUpdated.map(k => `\`${k}\``).join(', ')}` : ''}${removed.length > 0 ? `\n- Removed: ${removed.map(k => `\`${k}\``).join(', ')}` : ''}`
    };
  })
  .build();
