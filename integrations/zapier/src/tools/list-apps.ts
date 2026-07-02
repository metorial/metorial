import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listApps = SlateTool.create(spec, {
  name: 'List Apps',
  key: 'list_apps',
  description: `Browse and search the Zapier app directory. Returns apps available on Zapier's platform, sorted by popularity.
Use this to discover which apps are available for building Zaps, filter by category, or search by name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Filter apps by matching title'),
      category: z.string().optional().describe('Category slug to filter apps by'),
      appIds: z
        .string()
        .optional()
        .describe(
          'Comma-separated app IDs to retrieve specific apps. Cannot be used with category.'
        ),
      limit: z.number().optional().describe('Maximum number of apps to return (default: 10)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      apps: z.array(
        z.object({
          appId: z.string().describe('Unique identifier for the app'),
          title: z.string().describe('App name'),
          description: z.string().describe('App description'),
          image: z.string().describe('App icon URL'),
          hexColor: z.string().describe('App brand color'),
          actionTypes: z.array(z.string()).describe('Available action types for this app'),
          connectNewAuthenticationUrl: z
            .string()
            .optional()
            .describe('Zapier URL for starting a browser-based connection flow'),
          categories: z.array(z.object({ slug: z.string() })).describe('App categories'),
          images: z
            .object({
              url16x16: z.string(),
              url32x32: z.string(),
              url64x64: z.string(),
              url128x128: z.string()
            })
            .describe('App icon URLs in various sizes')
        })
      ),
      totalCount: z.number().describe('Total number of matching apps')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getApps({
      query: ctx.input.query,
      category: ctx.input.category,
      ids: ctx.input.appIds,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let apps = response.data.map(app => ({
      appId: app.id,
      title: app.title,
      description: app.description,
      image: app.image,
      hexColor: app.hexColor,
      actionTypes: app.actionTypes || [],
      connectNewAuthenticationUrl: app.links?.connectNewAuthentication,
      categories: app.categories || [],
      images: app.images
    }));

    return {
      output: {
        apps,
        totalCount: response.meta.count
      },
      message: `Found **${response.meta.count}** app(s)${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}${ctx.input.category ? ` in category "${ctx.input.category}"` : ''}. Returned ${apps.length} result(s).`
    };
  })
  .build();
