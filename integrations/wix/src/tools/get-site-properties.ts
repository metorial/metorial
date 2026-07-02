import { SlateTool } from 'slates';
import { z } from 'zod';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

export let getSiteProperties = SlateTool.create(spec, {
  name: 'Get Site Properties',
  key: 'get_site_properties',
  description: `Retrieve the site's metadata including business name, description, logo, contact info, locale settings, and more.
Returns comprehensive site configuration and business information in a single call.`,
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      properties: z
        .any()
        .describe('Site properties including business info, locale, contact details')
    })
  )
  .handleInvocation(async ctx => {
    let client = createWixClient(ctx.auth, ctx.config);
    let result = await client.getSiteProperties();
    return {
      output: { properties: result.properties || result },
      message: `Retrieved site properties${result.properties?.siteDisplayName ? ` for **${result.properties.siteDisplayName}**` : ''}`
    };
  })
  .build();
