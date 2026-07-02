import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TypeformClient } from '../lib/client';
import { spec } from '../spec';

export let listThemes = SlateTool.create(spec, {
  name: 'List Themes',
  key: 'list_themes',
  description: `Retrieve a list of visual themes available in your Typeform account. Themes control the appearance of forms including colors, fonts, and backgrounds.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of themes per page')
    })
  )
  .output(
    z.object({
      totalItems: z.number().describe('Total number of themes'),
      themes: z
        .array(
          z.object({
            themeId: z.string().describe('Theme ID'),
            name: z.string().describe('Theme name'),
            colors: z
              .object({
                question: z.string().optional(),
                answer: z.string().optional(),
                button: z.string().optional(),
                background: z.string().optional()
              })
              .optional()
              .describe('Theme colors'),
            font: z.string().optional().describe('Theme font'),
            roundedCorners: z.string().optional().describe('Rounded corner style')
          })
        )
        .describe('Array of themes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypeformClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listThemes({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let themes = (result.items || []).map((t: any) => ({
      themeId: t.id,
      name: t.name,
      colors: t.colors,
      font: t.font,
      roundedCorners: t.rounded_corners
    }));

    return {
      output: {
        totalItems: result.total_items || themes.length,
        themes
      },
      message: `Found **${result.total_items || themes.length}** themes.`
    };
  })
  .build();
