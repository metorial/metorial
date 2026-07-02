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
      page: z.number().optional().describe('Page number for pagination'),
      resultsPerPage: z.number().optional().describe('Number of results per page (default 5)')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of addresses'),
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
    let client = new ShippoClient(ctx.auth.token);

    let result = await client.listAddresses({
      page: ctx.input.page,
      results: ctx.input.resultsPerPage
    });

    let addresses = result.results.map((addr: any) => ({
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
        addresses
      },
      message: `Found **${result.count}** addresses. Showing ${addresses.length} on this page.`
    };
  })
  .build();
