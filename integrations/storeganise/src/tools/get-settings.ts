import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSettingsTool = SlateTool.create(spec, {
  name: 'Get Settings',
  key: 'get_settings',
  description: `Retrieve your Storeganise account settings including brand name, currency, service areas, available items, plans, and products. Useful for understanding the account configuration and available options.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      settings: z
        .record(z.string(), z.any())
        .describe('Account settings including brand, currency, items, plans, and products')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let settings = await client.getSettings();

    return {
      output: { settings },
      message: `Retrieved account settings${settings.brandName ? ` for **${settings.brandName}**` : ''}.`
    };
  })
  .build();
