import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getListResult, getObjectResult } from '../lib/client';
import { spec } from '../spec';

export let listWidgets = SlateTool.create(spec, {
  name: 'List Widgets',
  key: 'list_widgets',
  description: `Retrieve a paginated list of widgets, or get a specific widget by ID. Widgets are deployment endpoints for AI agents — they can be embedded on websites, connected to telephony providers for voice, or linked to messaging channels.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      widgetId: z.string().optional().describe('Specific widget ID to retrieve'),
      page: z.number().optional().describe('Page number (default 1)'),
      size: z.number().optional().describe('Items per page (default 50, max 100)')
    })
  )
  .output(
    z.object({
      widgets: z
        .array(
          z.object({
            widgetId: z.string(),
            name: z.string().optional(),
            assistantId: z.string().optional()
          })
        )
        .optional(),
      widget: z
        .object({
          widgetId: z.string(),
          name: z.string().optional(),
          assistantId: z.string().optional()
        })
        .optional(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.widgetId) {
      let result = await client.getWidget(ctx.input.widgetId);
      let data = getObjectResult(result);
      return {
        output: {
          widget: {
            widgetId: data.id,
            name: data.name ?? undefined,
            assistantId: data.assistant_id ?? undefined
          }
        },
        message: `Retrieved widget **${data.name || data.id}**.`
      };
    }

    let result = await client.listWidgets({ page: ctx.input.page, size: ctx.input.size });
    let { items: list, total } = getListResult(result);
    return {
      output: {
        widgets: list.map((w: any) => ({
          widgetId: w.id,
          name: w.name ?? undefined,
          assistantId: w.assistant_id ?? undefined
        })),
        totalCount: total
      },
      message: `Found **${list.length}** widget(s).`
    };
  })
  .build();
