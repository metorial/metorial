import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let getSiteInfo = SlateTool.create(spec, {
  name: 'Get Site Info',
  key: 'get_site_info',
  description: `Retrieves site-level information including name, category, timezone, admin email, custom resource property definitions, and photos.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      name: z.string().optional().describe('Site name'),
      category: z.string().optional().describe('Site category'),
      email: z.string().optional().describe('Admin email'),
      adminId: z.string().optional().describe('Admin user ID'),
      timezone: z.string().optional().describe('Site timezone'),
      defaultLanguage: z.string().optional().describe('Default language code'),
      properties: z.any().optional().describe('Site properties'),
      customResourceProperties: z
        .any()
        .optional()
        .describe('Custom resource property definitions'),
      photos: z.any().optional().describe('Site photos')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let r = await client.getSiteInfo();

    return {
      output: {
        name: r.name,
        category: r.category,
        email: r.email,
        adminId: r.admin_id ? String(r.admin_id) : undefined,
        timezone: r.timezone,
        defaultLanguage: r.default_language,
        properties: r.properties,
        customResourceProperties: r.custom_resource_properties,
        photos: r.photos
      },
      message: `Site **"${r.name || 'Unknown'}"** — ${r.category || 'no category'}, timezone: ${r.timezone || 'not set'}.`
    };
  })
  .build();
