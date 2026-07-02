import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchSuggestions = SlateTool.create(spec, {
  name: 'Search Suggestions',
  key: 'search_suggestions',
  description: `Get search discovery data from GIPHY including trending search terms, related search suggestions for a query, autocomplete results for partial input, and content categories. Use the **mode** parameter to choose which discovery feature to use.`,
  instructions: [
    'Use "trending" mode to discover what people are currently searching for on GIPHY.',
    'Use "related" mode with a term to find related search queries.',
    'Use "autocomplete" mode with a partial query to power search-as-you-type features.',
    'Use "categories" mode to browse high-level content categories and subcategories.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z
        .enum(['trending', 'related', 'autocomplete', 'categories'])
        .describe(
          'Discovery mode: trending terms, related suggestions, autocomplete, or categories'
        ),
      query: z
        .string()
        .optional()
        .describe('Search term (required for "related" and "autocomplete" modes)'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Number of results for autocomplete mode (1-50)'),
      offset: z.number().min(0).optional().describe('Results offset for autocomplete mode')
    })
  )
  .output(
    z.object({
      trendingTerms: z
        .array(z.string())
        .optional()
        .describe('Trending search terms (for "trending" mode)'),
      relatedTerms: z
        .array(z.object({ name: z.string() }))
        .optional()
        .describe('Related search suggestions (for "related" mode)'),
      autocompleteTags: z
        .array(z.object({ name: z.string() }))
        .optional()
        .describe('Autocomplete tag results (for "autocomplete" mode)'),
      categories: z
        .array(
          z.object({
            name: z.string(),
            nameEncoded: z.string(),
            subcategories: z.array(
              z.object({
                name: z.string(),
                nameEncoded: z.string()
              })
            )
          })
        )
        .optional()
        .describe('Content categories with subcategories (for "categories" mode)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.mode === 'trending') {
      let result = await client.trendingSearchTerms();
      return {
        output: { trendingTerms: result.terms },
        message: `Found ${result.terms.length} trending search terms.`
      };
    }

    if (ctx.input.mode === 'related') {
      if (!ctx.input.query) {
        throw new Error('A query is required for "related" mode.');
      }
      let result = await client.searchSuggestions(ctx.input.query);
      return {
        output: { relatedTerms: result.suggestions },
        message: `Found ${result.suggestions.length} related terms for "${ctx.input.query}".`
      };
    }

    if (ctx.input.mode === 'autocomplete') {
      if (!ctx.input.query) {
        throw new Error('A query is required for "autocomplete" mode.');
      }
      let result = await client.autocomplete({
        query: ctx.input.query,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      return {
        output: { autocompleteTags: result.tags },
        message: `Found ${result.tags.length} autocomplete suggestions for "${ctx.input.query}".`
      };
    }

    // categories mode
    let result = await client.getCategories();
    return {
      output: { categories: result.categories },
      message: `Found ${result.categories.length} content categories.`
    };
  })
  .build();
