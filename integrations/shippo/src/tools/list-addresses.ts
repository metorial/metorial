import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let listAddresses = SlateTool.create(spec, {
  name: 'List Addresses',
  key: 'list_addresses',
  description: `Retrieve a paginated list of all stored addresses. Use this to browse saved addresses for reuse in shipments.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      nextPage: z
        .string()
        .optional()
        .describe(
          'Exact nextLink from the preceding result. Omit page and keep any supplied filters and page size unchanged.'
        ),
      page: z.number().optional().describe('Page number for pagination'),
      resultsPerPage: z.number().optional().describe('Number of results per page (default 5)')
    })
  )
  .output(
    z.object({
      nextLink: z
        .string()
        .optional()
        .describe('Exact provider continuation; pass as nextPage to this tool.'),
      previousLink: z.string().optional(),
      hasMore: z.boolean().optional(),
      totalCount: z.number().optional().describe('Total number of addresses'),
      addresses: z.array(
        z.object({
          addressId: z.string(),
          name: z.string().optional(),
          company: z.string().optional(),
          street1: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zip: z.string().optional(),
          country: z.string().optional(),
          isResidential: z.boolean().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth);

    let result = await client.listAddresses({
      nextPage: ctx.input.nextPage,
      page: ctx.input.page,
      results: ctx.input.resultsPerPage
    });

    let addresses = result.results.map(addr => ({
      addressId: addr.object_id,
      name: addr.name,
      company: addr.company,
      street1: addr.street1,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      country: addr.country,
      isResidential: addr.is_residential
    }));

    return {
      output: {
        totalCount: result.count,
        nextLink: result.next,
        previousLink: result.previous,
        hasMore: !!result.next,
        addresses
      },
      message: `Retrieved this page of addresses. Showing ${addresses.length} on this page.`
    };
  })
  .build();
