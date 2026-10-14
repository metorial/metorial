import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let businessResultSchema = z.object({
  enigmaId: z.string().optional().describe('Enigma ID of the business'),
  entityId: z
    .string()
    .optional()
    .describe('GraphQL entity ID for SearchInput.id; distinct from the legacy Enigma ID'),
  entityType: z.string().optional().describe('Entity type (e.g., BRAND, OPERATING_LOCATION)'),
  names: z.array(z.string()).optional().describe('Business names'),
  addresses: z
    .array(
      z.object({
        fullAddress: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional()
      })
    )
    .optional()
    .describe('Business addresses'),
  websites: z.array(z.string()).optional().describe('Business websites'),
  industries: z.array(z.string()).optional().describe('Industry descriptions')
});

interface GraphqlConnection<T> {
  edges?: ({ node?: T | null } | null)[] | null;
}

interface AddressNode {
  fullAddress?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}

interface BusinessNode {
  __typename: 'Brand' | 'OperatingLocation';
  id: string;
  enigmaId?: string | null;
  names?: GraphqlConnection<{ name?: string | null }> | null;
  addresses?: GraphqlConnection<AddressNode> | null;
  websites?: GraphqlConnection<{ url?: string | null }> | null;
  industries?: GraphqlConnection<{ description?: string | null }> | null;
  operatingLocations?: GraphqlConnection<{
    addresses?: GraphqlConnection<AddressNode> | null;
  }> | null;
}

let nodes = <T>(connection?: GraphqlConnection<T> | null): T[] =>
  connection?.edges?.flatMap(edge => (edge?.node ? [edge.node] : [])) ?? [];

let searchQuery = `
  query SearchBusinesses($searchInput: SearchInput!) {
    search(searchInput: $searchInput) {
      __typename
      ... on Brand {
        id
        enigmaId
        names(first: 5) { edges { node { name } } }
        websites(first: 3) { edges { node { url: website } } }
        industries(first: 3) { edges { node { description: industryDesc } } }
        operatingLocations(first: 5) {
          edges {
            node {
              addresses(first: 1) {
                edges { node { fullAddress city state postalCode: zip } }
              }
            }
          }
        }
      }
      ... on OperatingLocation {
        id
        enigmaId
        names(first: 5) { edges { node { name } } }
        addresses(first: 3) {
          edges { node { fullAddress city state postalCode: zip } }
        }
        websites(first: 3) { edges { node { url: website } } }
      }
    }
  }
`;

export let searchBusinesses = SlateTool.create(spec, {
  name: 'Search Businesses',
  key: 'search_businesses',
  description: `Search for businesses in Enigma's database using the GraphQL API. Find businesses by name, entity type, and location, with support for pagination.

Returns a list of matching business profiles including names, addresses, websites, and industry information. Useful for building prospect lists or exploring businesses in a specific area or industry.`,
  instructions: [
    'Provide a business name or partial name to search for.',
    'Optionally filter by entity type (BRAND or OPERATING_LOCATION) and state.',
    'Pass endCursor as cursor to retrieve the next page with the same search inputs.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().describe('Business name or partial name to search for'),
      entityType: z
        .enum(['BRAND', 'OPERATING_LOCATION'])
        .optional()
        .describe('Filter by entity type'),
      state: z
        .string()
        .optional()
        .describe('Two-letter state code to filter by (e.g., NY, CA)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .describe('Maximum number of results to return (1-50)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous search result')
    })
  )
  .output(
    z.object({
      businesses: z.array(businessResultSchema).describe('List of matching businesses'),
      totalCount: z
        .number()
        .optional()
        .describe('Total number of matching results, when supplied by the API'),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().optional().describe('Cursor for fetching the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let offset = ctx.input.cursor === undefined ? 0 : Number(ctx.input.cursor);
    if (
      ctx.input.cursor !== undefined &&
      (!/^\d+$/.test(ctx.input.cursor) || !Number.isSafeInteger(offset))
    ) {
      throw createApiServiceError(
        'The search cursor is invalid. Use endCursor from a previous search.'
      );
    }

    let result = await client.graphqlData<{ search?: (BusinessNode | null)[] | null }>(
      searchQuery,
      {
        searchInput: {
          name: ctx.input.name,
          entityType: ctx.input.entityType ?? 'BRAND',
          ...(ctx.input.state ? { address: { state: ctx.input.state } } : {}),
          conditions: { limit: ctx.input.limit + 1, pageToken: String(offset) }
        }
      }
    );
    if (result.search !== null && !Array.isArray(result.search)) {
      throw createApiServiceError('Enigma returned an invalid business search response.');
    }

    let results = (result.search ?? []).filter((node): node is BusinessNode => node !== null);
    let hasNextPage = results.length > ctx.input.limit;
    let businesses = results.slice(0, ctx.input.limit).map(node => {
      let addresses = node.addresses
        ? nodes(node.addresses)
        : nodes(node.operatingLocations).flatMap(location => nodes(location.addresses));
      return {
        enigmaId: node.enigmaId ?? undefined,
        entityId: node.id,
        entityType: node.__typename === 'OperatingLocation' ? 'OPERATING_LOCATION' : 'BRAND',
        names: nodes(node.names).flatMap(name => (name.name ? [name.name] : [])),
        addresses: addresses.map(address => ({
          fullAddress: address.fullAddress ?? undefined,
          city: address.city ?? undefined,
          state: address.state ?? undefined,
          postalCode: address.postalCode ?? undefined
        })),
        websites: nodes(node.websites).flatMap(website => (website.url ? [website.url] : [])),
        industries: nodes(node.industries).flatMap(industry =>
          industry.description ? [industry.description] : []
        )
      };
    });

    return {
      output: {
        businesses,
        hasNextPage,
        endCursor: businesses.length > 0 ? String(offset + businesses.length) : undefined
      },
      message: `Found **${businesses.length}** business(es) matching "${ctx.input.name}".${hasNextPage ? ' More results available.' : ''}`
    };
  })
  .build();
