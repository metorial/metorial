import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWidgets = SlateTool.create(spec, {
  name: 'List Widgets',
  key: 'list_widgets',
  description: `Retrieve all Endorsal widgets for your property. Widgets are embeddable components that display testimonials and reviews on your website. Use this to verify widget placement and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of widgets to return'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      widgets: z.array(
        z.object({
          widgetId: z.string().describe('Unique widget ID'),
          name: z.string().optional().describe('Widget name'),
          type: z.string().optional().describe('Widget type/layout'),
          enabled: z.boolean().optional().describe('Whether the widget is active'),
          widgetConfig: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Widget configuration and styling options'),
          created: z.number().optional().describe('Timestamp when widget was created'),
          updated: z.number().optional().describe('Timestamp when widget was last updated')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listWidgets({
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let widgets = (result.data || []).map(w => ({
      widgetId: w._id,
      name: w.name,
      type: w.type,
      enabled: w.enabled,
      widgetConfig: w.config,
      created: w.created,
      updated: w.updated
    }));

    return {
      output: { widgets },
      message: `Found **${widgets.length}** widget(s).`
    };
  })
  .build();
