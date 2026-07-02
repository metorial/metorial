import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let citySchema = z
  .object({
    cityCode: z.string().describe('Unique city code (e.g., NEW_YORK, DUBAI)'),
    name: z.string().describe('City display name'),
    imageUrl: z.string().optional().describe('City image URL')
  })
  .passthrough();

export let listCities = SlateTool.create(spec, {
  name: 'List Cities',
  key: 'list_cities',
  description: `List all active cities where Headout experiences are available.
Returns city codes, names, and image URLs. Use city codes to filter products, categories, and collections.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      cities: z.array(citySchema).describe('List of active cities'),
      total: z.number().optional().describe('Total number of cities'),
      nextOffset: z.number().optional().describe('Offset for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      languageCode: ctx.config.languageCode,
      currencyCode: ctx.config.currencyCode
    });

    let result = await client.listCities({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let cities = (result.items ?? []).map((c: any) => ({
      cityCode: c.code ?? c.cityCode ?? '',
      name: c.name ?? '',
      imageUrl: c.image?.url ?? c.imageUrl
    }));

    return {
      output: {
        cities,
        total: result.total,
        nextOffset: result.nextOffset
      },
      message: `Found ${result.total ?? cities.length} active cities. Showing ${cities.length} results.`
    };
  })
  .build();
