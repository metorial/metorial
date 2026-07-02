import { SlateTool } from 'slates';
import { z } from 'zod';
import { GammaClient } from '../lib/client';
import { spec } from '../spec';

export let listThemesTool = SlateTool.create(spec, {
  name: 'List Themes',
  key: 'list_themes',
  description: `Retrieve available themes from your Gamma workspace. Returns both standard Gamma themes and custom themes you've created.
Use theme IDs when generating content to control colors, fonts, and overall visual style.`,
  instructions: [
    'Use the query parameter to search themes by name (case-insensitive).',
    'Use the nextCursor from a previous response in the "after" parameter to paginate through results.'
  ],
  constraints: ['Maximum 50 themes per page.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search themes by name (case-insensitive)'),
      limit: z.number().optional().describe('Number of themes per page (max 50)'),
      after: z.string().optional().describe('Cursor token for fetching the next page')
    })
  )
  .output(
    z.object({
      themes: z
        .array(
          z.object({
            themeId: z
              .string()
              .describe('Unique theme identifier to use in content generation'),
            name: z.string().describe('Display name of the theme'),
            type: z.string().describe('Theme type: "standard" or "custom"'),
            colorKeywords: z
              .array(z.string())
              .optional()
              .describe('Color descriptors for the theme'),
            toneKeywords: z
              .array(z.string())
              .optional()
              .describe('Tone/mood descriptors for the theme')
          })
        )
        .describe('List of available themes'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextCursor: z.string().optional().describe('Cursor token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GammaClient(ctx.auth.token);

    let result = await client.listThemes({
      query: ctx.input.query,
      limit: ctx.input.limit,
      after: ctx.input.after
    });

    let themes = result.data.map(theme => ({
      themeId: theme.id,
      name: theme.name,
      type: theme.type,
      colorKeywords: theme.colorKeywords,
      toneKeywords: theme.toneKeywords
    }));

    let message = `Found **${themes.length}** theme(s)`;
    if (result.hasMore) {
      message += ` (more available)`;
    }
    message += `:\n${themes.map(t => `- **${t.name}** (${t.type}) - ID: \`${t.themeId}\``).join('\n')}`;

    return {
      output: {
        themes,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor
      },
      message
    };
  });
