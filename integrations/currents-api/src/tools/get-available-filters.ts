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
          'Map of language codes to language names (e.g., {"en": "English", "es": "Spanish"})'
        ),
      regions: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Map of region/country codes to country names (e.g., {"US": "United States", "GB": "United Kingdom"})'
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
        client.getAvailableLanguages().then(result => {
          output.languages = result.languages || {};
          fetched.push(`${Object.keys(output.languages).length} languages`);
        })
      );
    }

    if (includeRegions) {
      promises.push(
        client.getAvailableRegions().then(result => {
          output.regions = result.regions || {};
          fetched.push(`${Object.keys(output.regions).length} regions`);
        })
      );
    }

    if (includeCategories) {
      promises.push(
        client.getAvailableCategories().then(result => {
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
