import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUnitRentalsTool = SlateTool.create(spec, {
  name: 'List Unit Rentals',
  key: 'list_unit_rentals',
  description: `Retrieve active and historical unit rental records. Filter by site, user, rental state, or update timestamp. Returns rental pricing, status, and overdue information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().optional().describe('Filter rentals by site ID'),
      userId: z.string().optional().describe('Filter rentals by user/tenant ID'),
      state: z
        .string()
        .optional()
        .describe('Filter by rental state (e.g. "active", "completed", "reserved")'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return rentals updated after this UTC timestamp'),
      limit: z.number().optional().describe('Maximum number of rentals to return'),
      offset: z.number().optional().describe('Number of rentals to skip for pagination')
    })
  )
  .output(
    z.object({
      unitRentals: z
        .array(z.record(z.string(), z.any()))
        .describe('List of unit rental records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let unitRentals = await client.listUnitRentals({
      siteId: ctx.input.siteId,
      userId: ctx.input.userId,
      state: ctx.input.state,
      updatedAfter: ctx.input.updatedAfter,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: { unitRentals },
      message: `Retrieved ${unitRentals.length} unit rental(s).`
    };
  })
  .build();
