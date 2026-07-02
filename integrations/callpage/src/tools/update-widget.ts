import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

export let updateWidget = SlateTool.create(spec, {
  name: 'Update Widget',
  key: 'update_widget',
  description: `Update an existing widget's configuration. You can change its URL, description, locale, enabled state, and widget settings such as call algorithm, call direction, color scheme, and more.`,
  instructions: [
    'Only provide the fields you want to update; unset fields will remain unchanged.',
    'Supported locales: cn, cz, de, ee, en, es, fr, hu, it, lt, pl, pt, ru, se, tr'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      widgetId: z.number().describe('The ID of the widget to update'),
      url: z.string().optional().describe('New website URL for the widget'),
      description: z.string().optional().describe('New description for the widget'),
      localeCode: z.string().optional().describe('New language locale'),
      enabled: z.boolean().optional().describe('Enable or disable the widget'),
      settings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Widget settings object (call algorithm, colors, positioning, etc.)')
    })
  )
  .output(
    z.object({
      widgetId: z.number().describe('The ID of the updated widget')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    let result = await client.updateWidget({
      widgetId: ctx.input.widgetId,
      url: ctx.input.url,
      description: ctx.input.description,
      localeCode: ctx.input.localeCode,
      enabled: ctx.input.enabled,
      settings: ctx.input.settings
    });

    return {
      output: { widgetId: result.widgetId },
      message: `Updated widget **#${result.widgetId}**.`
    };
  })
  .build();
