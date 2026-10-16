import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAvailableFilters = SlateTool.create(spec, {
  name: 'Get Available Filters',
  key: 'get_available_filters',
  description: `Retrieve the supported filter values for news queries: languages, regions (countries), and categories. Use this to discover valid filter codes before searching or fetching news. You can request any combination of filter types in a single call.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      apiVersion: z
        .enum(['v1', 'v2'])
        .optional()
        .describe(
          'Filter taxonomy version. Defaults to v1 for existing feeds and search_news; use v2 for search_news_v2.'
        ),
      includeLanguages: z
        .boolean()
        .optional()
        .describe('Include available language codes and their names. Defaults to true.'),
      includeRegions: z
        .boolean()
        .optional()
        .describe('Include available region/country codes and their names. Defaults to true.'),
      includeCategories: z
        .boolean()
        .optional()
        .describe('Include available news categories. Defaults to true.')
    })
  )
  .output(
    z.object({
      languages: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Provider map of language names to query codes (e.g., {"English": "en", "Spanish": "es"})'
        ),
      regions: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Provider map of region/country names to query codes (e.g., {"United States": "US"})'
        ),
      categories: z.array(z.string()).optional().describe('List of available news categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let includeLanguages = ctx.input.includeLanguages !== false;
    let includeRegions = ctx.input.includeRegions !== false;
    let includeCategories = ctx.input.includeCategories !== false;

    let output: {
      languages?: Record<string, string>;
      regions?: Record<string, string>;
      categories?: string[];
    } = {};

    let fetched: string[] = [];

    let promises: Promise<void>[] = [];

    if (includeLanguages) {
      promises.push(
        client.getAvailableLanguages(ctx.input.apiVersion).then(result => {
          output.languages = result.languages || {};
          fetched.push(`${Object.keys(output.languages).length} languages`);
        })
      );
    }

    if (includeRegions) {
      promises.push(
        client.getAvailableRegions(ctx.input.apiVersion).then(result => {
          output.regions = result.regions || {};
          fetched.push(`${Object.keys(output.regions).length} regions`);
        })
      );
    }

    if (includeCategories) {
      promises.push(
        client.getAvailableCategories(ctx.input.apiVersion).then(result => {
          output.categories = result.categories || [];
          fetched.push(`${output.categories.length} categories`);
        })
      );
    }

    await Promise.all(promises);

    return {
      output,
      message: `Retrieved available filters: ${fetched.join(', ')}.`
    };
  })
  .build();
