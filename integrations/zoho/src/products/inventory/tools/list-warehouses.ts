import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { createClient, organizationIdSchema } from '../lib/helpers';

export let listWarehouses = SlateTool.create(spec, {
  name: 'Inventory List Warehouses',
  key: 'inventory_list_warehouses',
  description: `List all warehouses/locations configured in the organization. Returns warehouse names, addresses, and statuses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      warehouses: z.array(
        z.object({
          warehouseId: z.string().describe('Warehouse ID'),
          warehouseName: z.string().describe('Warehouse name'),
          status: z.string().optional().describe('Warehouse status'),
          city: z.string().optional().describe('City'),
          state: z.string().optional().describe('State'),
          country: z.string().optional().describe('Country'),
          isPrimary: z.boolean().optional().describe('Whether this is the primary warehouse')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listWarehouses({
      page: ctx.input.page,
      per_page: ctx.input.perPage
    });

    let warehouses = (result.warehouses || []).map((w: any) => ({
      warehouseId: String(w.warehouse_id),
      warehouseName: w.warehouse_name,
      status: w.status ?? undefined,
      city: w.address?.city ?? undefined,
      state: w.address?.state ?? undefined,
      country: w.address?.country ?? undefined,
      isPrimary: w.is_primary ?? undefined
    }));

    return {
      output: {
        warehouses
      },
      message: `Found **${warehouses.length}** warehouses.`
    };
  })
  .build();
