import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

export let createWidget = SlateTool.create(spec, {
  name: 'Create Widget',
  key: 'create_widget',
  description: `Create a new callback widget for a website URL. The widget can be configured with a locale and description. After creation, you can configure managers and settings separately.`,
  instructions: [
    'Supported locales: cn, cz, de, ee, en, es, fr, hu, it, lt, pl, pt, ru, se, tr'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      url: z.string().describe('Website URL where the widget will be embedded'),
      description: z.string().optional().describe('Description for the widget'),
      localeCode: z
        .string()
        .optional()
        .describe('Widget language locale (e.g., en, de, fr, pl)')
    })
  )
  .output(
    z.object({
      widgetId: z.number().describe('The ID of the newly created widget')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    let result = await client.createWidget({
      url: ctx.input.url,
      description: ctx.input.description,
      localeCode: ctx.input.localeCode
    });

    return {
      output: { widgetId: result.widgetId },
      message: `Created widget **#${result.widgetId}** for **${ctx.input.url}**.`
    };
  })
  .build();
