import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageWebsiteSettings = SlateTool.create(spec, {
  name: 'Manage Website Settings',
  key: 'manage_website_settings',
  description: `Get or update the Crisp website (workspace) settings. When no settings are provided, returns the current configuration. When settings are provided, updates them. Settings include chatbox appearance, contact info, email preferences, and more.`,
  instructions: [
    'To read current settings, call without providing any settings fields.',
    'To update, provide only the fields you want to change.'
  ]
})
  .input(
    z.object({
      settings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Settings key-value pairs to update. Omit to read current settings.')
    })
  )
  .output(
    z.object({
      settings: z.record(z.string(), z.any()).describe('Current or updated website settings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteId: ctx.config.websiteId,
      tier: ctx.auth.tier
    });

    if (ctx.input.settings && Object.keys(ctx.input.settings).length > 0) {
      await client.updateWebsiteSettings(ctx.input.settings);
      let updated = await client.getWebsiteSettings();
      return {
        output: { settings: updated || {} },
        message: `Updated website settings.`
      };
    }

    let settings = await client.getWebsiteSettings();
    return {
      output: { settings: settings || {} },
      message: `Retrieved current website settings.`
    };
  })
  .build();
