import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

interface BusinessCounts {
  brandsCount?: number | null;
  operatingLocationsCount?: number | null;
  legalEntitiesCount?: number | null;
}

export let countBusinesses = SlateTool.create(spec, {
  name: 'Count Businesses',
  key: 'count_businesses',
  description:
    'Count operating locations, their associated brands, and legal entities in a U.S. city, state, or ZIP code. Optionally count only open operating locations.',
  instructions: ['Provide at least one of city, state, or postalCode to select an area.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      city: z.string().optional().describe('City to search'),
      state: z.string().optional().describe('Two-letter U.S. state code'),
      postalCode: z.string().optional().describe('Five-digit U.S. ZIP code'),
      openOnly: z
        .boolean()
        .default(false)
        .describe('Count only operating locations with status Open')
    })
  )
  .output(
    z.object({
      brandsCount: z.number().nullish().describe('Number of associated brands'),
      operatingLocationsCount: z.number().nullish().describe('Number of operating locations'),
      legalEntitiesCount: z.number().nullish().describe('Number of associated legal entities')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ![ctx.input.city, ctx.input.state, ctx.input.postalCode].some(value => value?.trim())
    ) {
      throw createApiServiceError(
        'Provide city, state, or postalCode to count businesses in an area.'
      );
    }
    let client = new Client({ token: ctx.auth.token });
    let result = await client.graphqlData<{ aggregate?: BusinessCounts | null }>(
      `query CountBusinesses($searchInput: SearchInput!) {
        aggregate(searchInput: $searchInput) {
          brandsCount: count(field: "brand")
          operatingLocationsCount: count(field: "operatingLocation")
          legalEntitiesCount: count(field: "legalEntity")
        }
      }`,
      {
        searchInput: {
          entityType: 'OPERATING_LOCATION',
          address: {
            ...(ctx.input.city ? { city: ctx.input.city } : {}),
            ...(ctx.input.state ? { state: ctx.input.state } : {}),
            ...(ctx.input.postalCode ? { postalCode: ctx.input.postalCode } : {})
          },
          ...(ctx.input.openOnly
            ? { conditions: { filter: { EQ: ['operatingStatuses.operatingStatus', 'Open'] } } }
            : {})
        }
      }
    );
    if (!result.aggregate) {
      throw createApiServiceError(
        'Enigma returned no business counts for the requested area.'
      );
    }
    return {
      output: result.aggregate,
      message: `Retrieved business counts for the requested area${ctx.input.openOnly ? ', filtered to open operating locations' : ''}.`
    };
  })
  .build();
