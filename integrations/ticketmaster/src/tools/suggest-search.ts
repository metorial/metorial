import { SlateTool } from 'slates';
import { z } from 'zod';
import { DiscoveryClient } from '../lib/client';
import { spec } from '../spec';

let suggestionSchema = z.object({
  resourceType: z
    .string()
    .describe('Type of suggestion: events, attractions, venues, products'),
  items: z.array(
    z.object({
      resourceId: z.string(),
      name: z.string(),
      url: z.string(),
      locale: z.string(),
      images: z.array(
        z.object({
          url: z.string(),
          width: z.number().nullable(),
          height: z.number().nullable()
        })
      )
    })
  )
});

export let suggestSearchTool = SlateTool.create(spec, {
  name: 'Suggest Search',
  key: 'suggest_search',
  description: `Type-ahead autocomplete search across Ticketmaster events, attractions, and venues. Returns matching suggestions grouped by resource type. Useful for building search interfaces or quickly finding the right entity.`,
  instructions: [
    'Use the "resource" parameter to limit suggestions to specific types: "events", "attractions", "venues", or "products".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().describe('Search keyword for autocomplete suggestions'),
      resource: z
        .string()
        .optional()
        .describe(
          'Limit to resource type: events, attractions, venues, products (comma-separated for multiple)'
        ),
      countryCode: z.string().optional().describe('ISO country code to filter suggestions'),
      source: z.string().optional().describe('Source platform filter'),
      size: z.number().optional().describe('Number of suggestions to return (default 5)')
    })
  )
  .output(
    z.object({
      suggestions: z.array(suggestionSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiscoveryClient({
      token: ctx.auth.token,
      countryCode: ctx.config.countryCode,
      locale: ctx.config.locale
    });

    let response = await client.suggest({
      keyword: ctx.input.keyword,
      resource: ctx.input.resource,
      countryCode: ctx.input.countryCode,
      source: ctx.input.source,
      size: ctx.input.size
    });

    let embedded = response?._embedded || {};
    let suggestions: Array<{ resourceType: string; items: any[] }> = [];

    for (let [resourceType, resourceData] of Object.entries(embedded)) {
      let items = (Array.isArray(resourceData) ? resourceData : []).map((item: any) => ({
        resourceId: item.id || '',
        name: item.name || '',
        url: item.url || '',
        locale: item.locale || '',
        images: (item.images || []).slice(0, 3).map((img: any) => ({
          url: img.url || '',
          width: img.width ?? null,
          height: img.height ?? null
        }))
      }));

      if (items.length > 0) {
        suggestions.push({ resourceType, items });
      }
    }

    let totalItems = suggestions.reduce((sum, s) => sum + s.items.length, 0);

    return {
      output: { suggestions },
      message: `Found **${totalItems}** suggestions across **${suggestions.length}** categories for "${ctx.input.keyword}".`
    };
  })
  .build();
