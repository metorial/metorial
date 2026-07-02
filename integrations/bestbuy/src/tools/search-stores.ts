import { SlateTool } from 'slates';
import { z } from 'zod';
import { BestBuyClient } from '../lib/client';
import { spec } from '../spec';

export let searchStores = SlateTool.create(spec, {
  name: 'Search Stores',
  key: 'search_stores',
  description: `Find Best Buy store locations in the US and Puerto Rico. Search by postal code, coordinates, or store attributes. Returns addresses, hours, services offered, and distance from the search location. Includes Best Buy, Best Buy Mobile, and Best Buy Express locations.`,
  instructions: [
    'Provide postalCode or lat/lng for location-based search. Distance defaults to 25 miles.',
    'Use query for attribute-based filtering, e.g. "storeType=Big Box Store" or "region=CA".',
    'Combine location and attribute filters for precise results.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      postalCode: z
        .string()
        .optional()
        .describe('US postal code to search near, e.g. "90210"'),
      lat: z.number().optional().describe('Latitude for coordinate-based search'),
      lng: z.number().optional().describe('Longitude for coordinate-based search'),
      distance: z.number().optional().describe('Search radius in miles (default 25)'),
      query: z
        .string()
        .optional()
        .describe(
          'Additional attribute filter, e.g. "storeType=Big Box Store" or "region=CA"'
        ),
      show: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of fields to return, e.g. "storeId,name,address,city,region,postalCode,phone,hours,distance"'
        ),
      page: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 10)')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching stores'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      stores: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of store objects with location and service details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BestBuyClient({ token: ctx.auth.token });

    let result = await client.searchStores({
      postalCode: ctx.input.postalCode,
      lat: ctx.input.lat,
      lng: ctx.input.lng,
      distance: ctx.input.distance,
      query: ctx.input.query,
      show: ctx.input.show,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        total: result.total,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        stores: result.stores
      },
      message: `Found **${result.total}** stores (page ${result.currentPage} of ${result.totalPages}, showing ${result.stores.length} results).`
    };
  })
  .build();
