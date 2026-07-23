import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { missingRequiredAlternativeError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let emojiMatchSchema = z.object({
  name: z.string().describe('Workspace custom emoji name without surrounding colons'),
  url: z.string().optional().describe('Image URL for a custom emoji'),
  aliasFor: z.string().optional().describe('Target custom emoji name when this is an alias')
});

let emojiCategorySchema = z.object({
  name: z.string().optional().describe('Category name'),
  emojiNames: z.array(z.string()).optional().describe('Emoji names in the category')
});

export let searchEmojis = SlateTool.create(spec, {
  name: 'Search Emojis',
  key: 'search_emojis',
  description:
    'Search workspace custom emoji by name or alias target before using one in a message or reaction.',
  instructions: [
    'Use this for workspace custom emoji discovery. Standard Unicode emoji do not require lookup.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(slackActionScopes.emojiRead)
  .input(
    z.object({
      query: z
        .string()
        .min(1)
        .describe(
          'One or more comma-separated search terms. Terms match custom emoji names and alias targets case-insensitively.'
        ),
      includeCategories: z
        .boolean()
        .optional()
        .describe('Ask Slack to include custom emoji category information when available'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum number of matches to return (default and maximum 200)')
    })
  )
  .output(
    z.object({
      totalMatches: z
        .number()
        .describe('Total number of matching custom emoji before applying the limit'),
      matches: z.array(emojiMatchSchema).describe('Matching custom emoji and aliases'),
      categories: z
        .array(emojiCategorySchema)
        .optional()
        .describe('Emoji categories returned by Slack when includeCategories is set')
    })
  )
  .handleInvocation(async ctx => {
    let terms = ctx.input.query
      .split(',')
      .map(term => term.trim().toLowerCase())
      .filter(Boolean);

    if (terms.length === 0) {
      throw missingRequiredAlternativeError(
        'query must contain at least one non-empty search term'
      );
    }

    let { emoji, categories } = await new SlackClient(ctx.auth.token).listCustomEmojis(
      ctx.input.includeCategories
    );
    let allMatches = Object.entries(emoji)
      .map(([name, value]) => {
        let aliasFor = value.startsWith('alias:') ? value.slice('alias:'.length) : undefined;

        return {
          name,
          url: aliasFor ? undefined : value,
          aliasFor
        };
      })
      .filter(match =>
        terms.some(
          term =>
            match.name.toLowerCase().includes(term) ||
            match.aliasFor?.toLowerCase().includes(term)
        )
      )
      .sort((left, right) => left.name.localeCompare(right.name));
    let matches = allMatches.slice(0, ctx.input.limit ?? 200);

    return {
      output: {
        totalMatches: allMatches.length,
        matches,
        categories: ctx.input.includeCategories
          ? categories?.map(category => ({
              name: category.name,
              emojiNames: category.emoji_names
            }))
          : undefined
      },
      message: `Found **${allMatches.length}** custom emoji matching "${ctx.input.query}" (showing ${matches.length}).`
    };
  })
  .build();
