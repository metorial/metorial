import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSettings = SlateTool.create(spec, {
  name: 'Get Account Settings',
  key: 'get_settings',
  description: `Retrieves account settings, brand settings, and custom merge tags. Combine all three or select specific setting types to retrieve.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      include: z
        .array(z.enum(['account', 'brand', 'mergeTags']))
        .optional()
        .default(['account', 'brand', 'mergeTags'])
        .describe('Which settings to include. Defaults to all.')
    })
  )
  .output(
    z.object({
      accountSettings: z.any().optional().describe('General account settings'),
      brandSettings: z.any().optional().describe('Brand-specific settings'),
      mergeTags: z.any().optional().describe('Custom merge tags for dynamic content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let include = ctx.input.include;

    let accountSettings: any;
    let brandSettings: any;
    let mergeTags: any;

    if (include.includes('account')) {
      let result = await client.getSettings();
      accountSettings = result.data;
    }
    if (include.includes('brand')) {
      let result = await client.getBrandSettings();
      brandSettings = result.data;
    }
    if (include.includes('mergeTags')) {
      let result = await client.getMergeTags();
      mergeTags = result.data;
    }

    return {
      output: {
        accountSettings,
        brandSettings,
        mergeTags
      },
      message: `Retrieved settings: ${include.join(', ')}.`
    };
  })
  .build();
