import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWidgetStats = SlateTool.create(spec, {
  name: 'Get Widget Stats',
  key: 'get_widget_stats',
  description: `Retrieve widgets, their statistics, users, and images. Useful for ESP integrations that embed NiftyImages tools via a JavaScript widget, enabling automated syncing of data or passing on impression costs to widget users.
Can list all widgets, get aggregated stats, list users per widget, or get per-user stats and images.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      widgetKey: z
        .string()
        .optional()
        .describe(
          'The widget key. If not provided, lists all widgets or returns aggregated stats.'
        ),
      scope: z
        .enum(['widgets', 'stats', 'users', 'images'])
        .default('widgets')
        .describe(
          'What to retrieve: "widgets" lists all widgets, "stats" gets aggregated stats, "users" lists users for a widget, "images" lists images.'
        ),
      userId: z
        .string()
        .optional()
        .describe(
          'A specific user identifier to get per-user stats or images (requires widgetKey).'
        ),
      startDate: z
        .string()
        .optional()
        .describe('Start date for filtering in ISO 8601 format (e.g. 2024-01-01T00:00Z).'),
      endDate: z
        .string()
        .optional()
        .describe('End date for filtering in ISO 8601 format (e.g. 2024-12-31T23:59Z).')
    })
  )
  .output(
    z.object({
      widgets: z.array(z.any()).optional().describe('List of widgets.'),
      stats: z.any().optional().describe('Widget statistics.'),
      users: z.array(z.any()).optional().describe('List of widget users.'),
      images: z.any().optional().describe('Widget images.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let dateParams = { startDate: ctx.input.startDate, endDate: ctx.input.endDate };

    if (ctx.input.scope === 'widgets' && !ctx.input.widgetKey) {
      let widgets = await client.listWidgets();
      return {
        output: { widgets },
        message: `Retrieved **${Array.isArray(widgets) ? widgets.length : 0}** widget(s).`
      };
    }

    if (ctx.input.scope === 'stats' && !ctx.input.widgetKey) {
      let stats = await client.getAllWidgetStats(dateParams);
      return {
        output: { stats },
        message: `Retrieved aggregated widget stats.`
      };
    }

    if (!ctx.input.widgetKey) {
      throw new Error('Widget key is required for this scope when not listing all widgets.');
    }

    if (ctx.input.scope === 'stats' || ctx.input.scope === 'widgets') {
      if (ctx.input.userId) {
        let stats = await client.getWidgetUserStats(
          ctx.input.widgetKey,
          ctx.input.userId,
          dateParams
        );
        return {
          output: { stats },
          message: `Retrieved stats for user **${ctx.input.userId}** on widget **${ctx.input.widgetKey}**.`
        };
      }
      let stats = await client.getWidgetStats(ctx.input.widgetKey, dateParams);
      return {
        output: { stats },
        message: `Retrieved stats for widget **${ctx.input.widgetKey}**.`
      };
    }

    if (ctx.input.scope === 'users') {
      let users = await client.getWidgetUsers(ctx.input.widgetKey, dateParams);
      return {
        output: { users },
        message: `Retrieved **${Array.isArray(users) ? users.length : 0}** user(s) for widget **${ctx.input.widgetKey}**.`
      };
    }

    if (ctx.input.scope === 'images') {
      if (ctx.input.userId) {
        let images = await client.getWidgetUserImages(
          ctx.input.widgetKey,
          ctx.input.userId,
          dateParams
        );
        return {
          output: { images },
          message: `Retrieved images for user **${ctx.input.userId}** on widget **${ctx.input.widgetKey}**.`
        };
      }
      let images = await client.getWidgetImages(ctx.input.widgetKey, dateParams);
      return {
        output: { images },
        message: `Retrieved images for widget **${ctx.input.widgetKey}**.`
      };
    }

    throw new Error('Invalid scope/parameter combination.');
  })
  .build();
