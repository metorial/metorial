import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z.object({
  name: z.string().optional().describe('Name'),
  companyName: z.string().optional().describe('Company name'),
  phone: z.string().optional().describe('Phone number'),
  addressLine1: z.string().describe('Street address line 1'),
  addressLine2: z.string().optional().describe('Street address line 2'),
  cityLocality: z.string().optional().describe('City'),
  stateProvince: z.string().optional().describe('State/province'),
  postalCode: z.string().optional().describe('Postal code'),
  countryCode: z.string().describe('Two-letter ISO country code')
});

let warehouseOutputSchema = z.object({
  warehouseId: z.string().describe('Warehouse ID'),
  name: z.string().describe('Warehouse name'),
  createdAt: z.string().describe('Creation timestamp'),
  isDefault: z.boolean().describe('Whether this is the default warehouse'),
  originAddress: addressSchema.describe('Origin/ship-from address'),
  returnAddress: addressSchema.describe('Return address')
});

export let listWarehouses = SlateTool.create(spec, {
  name: 'List Warehouses',
  key: 'list_warehouses',
  description: `List all warehouse locations configured in your ShipEngine account. Warehouses can be used as ship-from addresses on shipments and labels.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      warehouses: z.array(warehouseOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listWarehouses();

    let warehouses = result.warehouses.map(mapWarehouseOutput);

    return {
      output: { warehouses },
      message: `Found **${warehouses.length}** warehouse(s).`
    };
  })
  .build();

export let createWarehouse = SlateTool.create(spec, {
  name: 'Create Warehouse',
  key: 'create_warehouse',
  description: `Create a new warehouse location that can be used as a ship-from address on shipments and labels. Optionally specify a different return address.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Warehouse name'),
      originAddress: addressSchema.describe('Origin/ship-from address'),
      returnAddress: addressSchema
        .optional()
        .describe('Return address (defaults to origin address)')
    })
  )
  .output(warehouseOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.createWarehouse({
      name: ctx.input.name,
      origin_address: mapAddressToApi(ctx.input.originAddress),
      return_address: ctx.input.returnAddress
        ? mapAddressToApi(ctx.input.returnAddress)
        : undefined
    });

    return {
      output: mapWarehouseOutput(result),
      message: `Created warehouse **${result.name}** (${result.warehouse_id}).`
    };
  })
  .build();

export let updateWarehouse = SlateTool.create(spec, {
  name: 'Update Warehouse',
  key: 'update_warehouse',
  description: `Update an existing warehouse's name, origin address, or return address.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      warehouseId: z.string().describe('ID of the warehouse to update'),
      name: z.string().optional().describe('Updated warehouse name'),
      originAddress: addressSchema.optional().describe('Updated origin address'),
      returnAddress: addressSchema.optional().describe('Updated return address')
    })
  )
  .output(warehouseOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let update: any = {};
    if (ctx.input.name) update.name = ctx.input.name;
    if (ctx.input.originAddress)
      update.origin_address = mapAddressToApi(ctx.input.originAddress);
    if (ctx.input.returnAddress)
      update.return_address = mapAddressToApi(ctx.input.returnAddress);

    let result = await client.updateWarehouse(ctx.input.warehouseId, update);

    return {
      output: mapWarehouseOutput(result),
      message: `Updated warehouse **${result.name}** (${result.warehouse_id}).`
    };
  })
  .build();

export let deleteWarehouse = SlateTool.create(spec, {
  name: 'Delete Warehouse',
  key: 'delete_warehouse',
  description: `Delete a warehouse location from your ShipEngine account.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      warehouseId: z.string().describe('ID of the warehouse to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the warehouse was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.deleteWarehouse(ctx.input.warehouseId);

    return {
      output: { deleted: true },
      message: `Deleted warehouse **${ctx.input.warehouseId}**.`
    };
  })
  .build();

let mapAddressToApi = (addr: any) => ({
  name: addr.name,
  company_name: addr.companyName,
  phone: addr.phone,
  address_line1: addr.addressLine1,
  address_line2: addr.addressLine2,
  city_locality: addr.cityLocality,
  state_province: addr.stateProvince,
  postal_code: addr.postalCode,
  country_code: addr.countryCode
});

let mapAddressFromApi = (addr: any) => ({
  name: addr?.name,
  companyName: addr?.company_name,
  phone: addr?.phone,
  addressLine1: addr?.address_line1 ?? '',
  addressLine2: addr?.address_line2,
  cityLocality: addr?.city_locality,
  stateProvince: addr?.state_province,
  postalCode: addr?.postal_code,
  countryCode: addr?.country_code ?? ''
});

let mapWarehouseOutput = (w: any) => ({
  warehouseId: w.warehouse_id,
  name: w.name,
  createdAt: w.created_at,
  isDefault: w.is_default,
  originAddress: mapAddressFromApi(w.origin_address),
  returnAddress: mapAddressFromApi(w.return_address)
});
