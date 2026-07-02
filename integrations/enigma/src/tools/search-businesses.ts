import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let businessResultSchema = z.object({
  enigmaId: z.string().optional().describe('Enigma ID of the business'),
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

export let searchBusinesses = SlateTool.create(spec, {
  name: 'Search Businesses',
  key: 'search_businesses',
  description: `Search for businesses in Enigma's database using the GraphQL API. Find businesses by name, entity type, and location, with support for pagination.

Returns a list of matching business profiles including names, addresses, websites, and industry information. Useful for building prospect lists or exploring businesses in a specific area or industry.`,
  instructions: [
    'Provide a business name or partial name to search for.',
    'Optionally filter by entity type (BRAND or OPERATING_LOCATION) and state.'
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
      totalCount: z.number().optional().describe('Total number of matching results'),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().optional().describe('Cursor for fetching the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let searchInputParts: string[] = [];
    searchInputParts.push(`name: "${ctx.input.name.replace(/"/g, '\\"')}"`);
    if (ctx.input.entityType) {
      searchInputParts.push(`entityType: ${ctx.input.entityType}`);
    }
    if (ctx.input.state) {
      searchInputParts.push(`address: { state: "${ctx.input.state}" }`);
    }

    let paginationArgs = `first: ${ctx.input.limit}`;
    if (ctx.input.cursor) {
      paginationArgs += `, after: "${ctx.input.cursor}"`;
    }

    let query = `
      query SearchBusinesses {
        search(searchInput: { ${searchInputParts.join(', ')} }) {
          ... on Brand {
            results(${paginationArgs}) {
              totalCount
              pageInfo {
                hasNextPage
                endCursor
              }
              edges {
                node {
                  enigmaId
                  names(first: 5) {
                    edges {
                      node {
                        name
                      }
                    }
                  }
                  websites(first: 3) {
                    edges {
                      node {
                        url
                      }
                    }
                  }
                  operatingLocations(first: 5) {
                    edges {
                      node {
                        addresses(first: 1) {
                          edges {
                            node {
                              fullAddress
                              city
                              state
                              postalCode
                            }
                          }
                        }
                      }
                    }
                  }
                  industries(first: 3) {
                    edges {
                      node {
                        description
                      }
                    }
                  }
                }
              }
            }
          }
          ... on OperatingLocation {
            results(${paginationArgs}) {
              totalCount
              pageInfo {
                hasNextPage
                endCursor
              }
              edges {
                node {
                  enigmaId
                  names(first: 5) {
                    edges {
                      node {
                        name
                      }
                    }
                  }
                  addresses(first: 3) {
                    edges {
                      node {
                        fullAddress
                        city
                        state
                        postalCode
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    let result = await client.graphqlQuery(query);

    let searchResult = result.data?.search;
    let resultsData = searchResult?.results;

    let businesses: Record<string, unknown>[] = [];
    let totalCount = resultsData?.totalCount;
    let hasNextPage = resultsData?.pageInfo?.hasNextPage ?? false;
    let endCursor = resultsData?.pageInfo?.endCursor;

    if (resultsData?.edges) {
      for (let edge of resultsData.edges) {
        let node = edge.node;
        if (!node) continue;

        let names =
          node.names?.edges
            ?.map((e: Record<string, { name?: string }>) => e.node?.name)
            .filter(Boolean) || [];

        let addresses: Record<string, unknown>[] = [];
        if (node.addresses?.edges) {
          addresses = node.addresses.edges.map(
            (e: Record<string, Record<string, unknown>>) => ({
              fullAddress: e.node?.fullAddress,
              city: e.node?.city,
              state: e.node?.state,
              postalCode: e.node?.postalCode
            })
          );
        } else if (node.operatingLocations?.edges) {
          for (let locEdge of node.operatingLocations.edges) {
            let locAddresses = locEdge.node?.addresses?.edges || [];
            for (let addrEdge of locAddresses) {
              addresses.push({
                fullAddress: addrEdge.node?.fullAddress,
                city: addrEdge.node?.city,
                state: addrEdge.node?.state,
                postalCode: addrEdge.node?.postalCode
              });
            }
          }
        }

        let websites =
          node.websites?.edges
            ?.map((e: Record<string, { url?: string }>) => e.node?.url)
            .filter(Boolean) || [];

        let industries =
          node.industries?.edges
            ?.map((e: Record<string, { description?: string }>) => e.node?.description)
            .filter(Boolean) || [];

        businesses.push({
          enigmaId: node.enigmaId,
          entityType: ctx.input.entityType || 'BRAND',
          names,
          addresses,
          websites,
          industries
        });
      }
    }

    return {
      output: {
        businesses,
        totalCount,
        hasNextPage,
        endCursor
      },
      message: `Found **${businesses.length}** business(es)${totalCount ? ` out of ${totalCount} total` : ''} matching "${ctx.input.name}".${hasNextPage ? ' More results available.' : ''}`
    };
  })
  .build();
