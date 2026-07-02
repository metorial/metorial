import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProcFuClient } from '../lib/client';
import { spec } from '../spec';

export let getPodioAppInfo = SlateTool.create(spec, {
  name: 'Get Podio App Info',
  key: 'get_podio_app_info',
  description: `Retrieve information about Podio apps. Can fetch:
- A single app's full payload by app ID.
- All apps in a workspace by space ID.
- Category field values for a specific app field.
- Recent activity (recently modified item IDs) for an app.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get_app', 'list_apps', 'get_field_categories', 'recent_activity'])
        .describe('The operation to perform'),
      appId: z
        .string()
        .optional()
        .describe(
          'The Podio App ID (required for get_app, get_field_categories, recent_activity)'
        ),
      spaceId: z
        .string()
        .optional()
        .describe('The Podio Space/Workspace ID (required for list_apps)'),
      fieldId: z
        .string()
        .optional()
        .describe('The field ID (required for get_field_categories)')
    })
  )
  .output(
    z.object({
      app: z.any().optional().describe('The app payload (for get_app)'),
      apps: z.any().optional().describe('Array of apps (for list_apps)'),
      categories: z
        .any()
        .optional()
        .describe('Category field values (for get_field_categories)'),
      recentItemIds: z
        .any()
        .optional()
        .describe('Recently active item IDs (for recent_activity)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProcFuClient({ token: ctx.auth.token });

    if (ctx.input.action === 'get_app') {
      if (!ctx.input.appId) throw new Error('appId is required for get_app');
      let app = await client.getAppRaw(ctx.input.appId);
      return {
        output: { app },
        message: `Retrieved app **${ctx.input.appId}** details.`
      };
    }

    if (ctx.input.action === 'list_apps') {
      if (!ctx.input.spaceId) throw new Error('spaceId is required for list_apps');
      let apps = await client.getSpaceApps(ctx.input.spaceId);
      let count = Array.isArray(apps) ? apps.length : 0;
      return {
        output: { apps },
        message: `Found **${count}** app(s) in workspace **${ctx.input.spaceId}**.`
      };
    }

    if (ctx.input.action === 'get_field_categories') {
      if (!ctx.input.appId || !ctx.input.fieldId)
        throw new Error('appId and fieldId are required for get_field_categories');
      let categories = await client.getAppFieldCategories(ctx.input.appId, ctx.input.fieldId);
      return {
        output: { categories },
        message: `Retrieved categories for field **${ctx.input.fieldId}** in app **${ctx.input.appId}**.`
      };
    }

    if (ctx.input.action === 'recent_activity') {
      if (!ctx.input.appId) throw new Error('appId is required for recent_activity');
      let recentItemIds = await client.getRecentActivity(ctx.input.appId);
      return {
        output: { recentItemIds },
        message: `Retrieved recent activity for app **${ctx.input.appId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
