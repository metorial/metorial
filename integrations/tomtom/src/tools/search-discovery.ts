import { SlateTool } from 'slates';
import { z } from 'zod';
import { TomTomClient } from '../lib/client';
import { spec } from '../spec';

export let autocomplete = SlateTool.create(spec, {
  name: 'Autocomplete Search Terms',
  key: 'autocomplete',
  description:
    'Recognize brand names, POI categories, and plain text in a search query. Use returned category IDs with search_geocode categorySet to refine a place search.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().trim().min(1).describe('Search text to recognize'),
      language: z.string().trim().min(1).describe('Language tag, such as en-US'),
      lat: z.number().min(-90).max(90).optional().describe('Bias latitude; provide with lon'),
      lon: z
        .number()
        .min(-180)
        .max(180)
        .optional()
        .describe('Bias longitude; provide with lat'),
      radius: z
        .number()
        .int()
        .min(0)
        .max(5000000)
        .optional()
        .describe('Area radius in meters; requires lat and lon'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe('Maximum suggestions (default 5)'),
      countrySet: z
        .string()
        .optional()
        .describe('Comma-separated country codes, such as US,CA'),
      resultSet: z
        .enum(['category', 'brand', 'category,brand'])
        .optional()
        .describe('Restrict recognized entity types')
    })
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          segments: z.array(
            z.object({
              type: z.string().describe('Recognized entity type'),
              value: z.string().describe('Recognized search term'),
              categoryId: z
                .string()
                .optional()
                .describe('Category ID for search_geocode categorySet'),
              matchedAlternativeName: z.string().optional(),
              matches: z.array(z.object({ offset: z.number(), length: z.number() })).optional()
            })
          )
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient(ctx.auth);
    let data = await client.autocomplete(ctx.input);
    let results = (data.results ?? []).map((result: any) => ({
      segments: (result.segments ?? []).map((segment: any) => ({
        type: segment.type,
        value: segment.value,
        categoryId: segment.id ?? undefined,
        matchedAlternativeName: segment.matchedAlternativeName ?? undefined,
        matches: segment.matches?.inputQuery ?? undefined
      }))
    }));
    return {
      output: { results },
      message: `Recognized search terms in **${results.length}** suggestion(s).`
    };
  })
  .build();

export let listPoiCategories = SlateTool.create(spec, {
  name: 'List POI Categories',
  key: 'list_poi_categories',
  description:
    'List TomTom point-of-interest categories, subcategory IDs, and synonyms. Pass selected IDs as comma-separated text to search_geocode categorySet.',
  tags: { readOnly: true }
})
  .input(
    z.object({ language: z.string().optional().describe('Language tag for category names') })
  )
  .output(
    z.object({
      categories: z.array(
        z.object({
          id: z.number().describe('Category ID'),
          name: z.string().describe('Category name'),
          childCategoryIds: z.array(z.number()).optional(),
          synonyms: z.array(z.string()).optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient(ctx.auth);
    let data = await client.listPoiCategories(ctx.input.language);
    let categories = (data.poiCategories ?? []).map((category: any) => ({
      id: category.id,
      name: category.name,
      childCategoryIds: category.childCategoryIds ?? undefined,
      synonyms: category.synonyms ?? undefined
    }));
    return {
      output: { categories },
      message: `Retrieved **${categories.length}** POI categories.`
    };
  })
  .build();
