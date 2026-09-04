import { SlateTool } from 'slates';
import { z } from 'zod';
import { GenesisClient } from '../lib/client';
import { destatisValidationError } from '../lib/errors';
import type { GenesisCatalogCategory, GenesisCatalogItem } from '../lib/types';
import { spec } from '../spec';
import {
  boundedPageLength,
  optionalProviderBoolean,
  optionalProviderCount,
  optionalProviderText,
  requireProviderText,
  trimmedRequiredString
} from './shared';

let publicCategorySchema = z.enum([
  'all',
  'tables',
  'statistics',
  'cubes',
  'variables',
  'time_series'
]);

let categoryMap: Record<
  z.infer<typeof publicCategorySchema>,
  GenesisCatalogCategory | 'all'
> = {
  all: 'all',
  tables: 'table',
  statistics: 'statistic',
  cubes: 'cube',
  variables: 'variable',
  time_series: 'time_series'
};

let itemTypeSchema = z.enum(['table', 'statistic', 'cube', 'variable', 'time_series']);

let searchCatalogInputSchema = z.object({
  term: trimmedRequiredString(
    'Keyword or phrase to find in the Destatis GENESIS-Online catalogue.'
  ),
  category: publicCategorySchema
    .optional()
    .default('all')
    .describe('Type of statistical object to search. Searches all object types by default.'),
  pageLength: boundedPageLength(
    50,
    'Maximum number of matching catalogue objects to return, from 1 to 1000.'
  )
});

let catalogItemSchema = z.object({
  type: itemTypeSchema.describe('Kind of GENESIS-Online catalogue object.'),
  code: z.string().describe('Stable provider code for this catalogue object.'),
  title: z.string().describe('Human-readable provider title or description.'),
  state: z.string().optional().describe('Provider availability or completeness state.'),
  timeRange: z.string().optional().describe('Available time span reported by the provider.'),
  lastUpdated: z.string().optional().describe('Provider-reported last update time.'),
  valueCount: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Number of values reported for a variable.'),
  hasInformation: z
    .boolean()
    .optional()
    .describe('Whether the provider reports additional information for this object.')
});

let mapCatalogItem = (item: GenesisCatalogItem): z.infer<typeof catalogItemSchema> => {
  let state = optionalProviderText(item.State);
  let timeRange = optionalProviderText(item.Time);
  let lastUpdated = optionalProviderText(item.LatestUpdate);
  let valueCount = optionalProviderCount(item.Values);
  let hasInformation = optionalProviderBoolean(item.Information);

  return {
    type: item.category,
    code: requireProviderText(item.Code, 'code'),
    title: requireProviderText(item.Content, 'title'),
    ...(state ? { state } : {}),
    ...(timeRange ? { timeRange } : {}),
    ...(lastUpdated ? { lastUpdated } : {}),
    ...(valueCount !== undefined ? { valueCount } : {}),
    ...(hasInformation !== undefined ? { hasInformation } : {})
  };
};

export let searchCatalog = SlateTool.create(spec, {
  name: 'Search Catalog',
  key: 'search_catalog',
  description:
    'Find Destatis GENESIS-Online tables, statistics, cubes, variables, and time series by keyword and return stable codes for follow-up analysis or download.',
  instructions: [
    'Use table and cube codes with get_metadata and the matching download tool.',
    'Use variable codes with get_metadata or list_variable_values to discover valid value codes before downloading filtered data.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(searchCatalogInputSchema)
  .output(
    z.object({
      items: z.array(catalogItemSchema).describe('Matching catalogue objects.'),
      warning: z
        .string()
        .optional()
        .describe('Non-fatal provider warning, including a normal no-results notice.'),
      copyright: z.string().optional().describe('Provider copyright and attribution notice.')
    })
  )
  .handleInvocation(async ctx => {
    let parsed = searchCatalogInputSchema.safeParse(ctx.input);
    if (!parsed.success) {
      let detail = parsed.error.issues[0]?.message ?? 'Invalid search input.';
      throw destatisValidationError(`Invalid catalog search input: ${detail}`);
    }

    let client = new GenesisClient({ token: ctx.auth.token });
    let result = await client.searchCatalog({
      language: ctx.config.language,
      searchTerm: parsed.data.term,
      category: categoryMap[parsed.data.category],
      pageLength: parsed.data.pageLength,
      allowNoResult: true
    });
    let items = result.data.map(mapCatalogItem);

    return {
      output: {
        items,
        ...(result.warning ? { warning: result.warning } : {}),
        ...(result.copyright ? { copyright: result.copyright } : {})
      },
      message: `Found **${items.length}** catalogue objects for **${parsed.data.term}**.`
    };
  })
  .build();
