import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapYelpOutput } from '../lib/response';
import { spec } from '../spec';

let categorySchema = z.object({
  alias: z.string().describe('Category alias to use in business search filters'),
  title: z.string().describe('Localized category name'),
  parentAliases: z.array(z.string()).optional().describe('Parent category aliases'),
  countryWhitelist: z
    .array(z.string())
    .optional()
    .describe('Countries where the category is available when restricted'),
  countryBlacklist: z
    .array(z.string())
    .optional()
    .describe('Countries where the category is unavailable')
});

let mapCategory = (category: Record<string, unknown>) => ({
  alias: category.alias,
  title: category.title,
  parentAliases: category.parent_aliases,
  countryWhitelist: category.country_whitelist,
  countryBlacklist: category.country_blacklist
});

let listOutputSchema = z.object({ categories: z.array(categorySchema) });
let getOutputSchema = z.object({ category: categorySchema });

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description:
    'Discover Yelp business category aliases and names for search filters. Optionally restrict and localize categories by locale.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      locale: z
        .string()
        .optional()
        .describe(
          'Locale such as en_US; omitted returns categories across all locales with English names'
        )
    })
  )
  .output(listOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listCategories(ctx.input.locale);
    return mapYelpOutput(listOutputSchema, () => {
      let categories = result.categories.map(mapCategory);
      return {
        output: { categories },
        message: `Retrieved ${categories.length} business categories.`
      };
    });
  })
  .build();

export let getCategory = SlateTool.create(spec, {
  name: 'Get Category',
  key: 'get_category',
  description:
    'Retrieve a Yelp business category and its parent and country restrictions. Call list_categories to discover category aliases.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      alias: z.string().describe('Category alias from list_categories'),
      locale: z
        .string()
        .optional()
        .describe('Locale such as en_US for availability and translated names')
    })
  )
  .output(getOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getCategory(
      ctx.input.alias,
      ctx.input.locale
    );
    return mapYelpOutput(getOutputSchema, () => {
      let category = mapCategory(result.category);
      return { output: { category }, message: `Retrieved category ${category.title}.` };
    });
  })
  .build();
