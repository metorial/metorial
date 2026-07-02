import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressOutputSchema = z.object({
  addressId: z.string().describe('Unique identifier for the address'),
  address: z.string().describe('Street address'),
  unit: z.string().nullable().describe('Unit or apartment number'),
  city: z.string().describe('City'),
  postalCode: z.string().describe('Postal code'),
  countryCode: z.string().nullable().describe('Country code'),
  addressName: z.string().nullable().describe('Friendly name for the address'),
  accessNotes: z.string().nullable().describe('Notes for accessing the property'),
  closingNotes: z.string().nullable().describe('Notes for closing/leaving the property'),
  paidParking: z.boolean().nullable().describe('Whether parking is paid'),
  parkingSpot: z.string().nullable().describe('Parking spot details'),
  parkingPayWith: z.string().nullable().describe('How to pay for parking'),
  maxParkingCost: z.number().nullable().describe('Maximum parking cost'),
  parkingNotes: z.string().nullable().describe('Additional parking notes'),
  createdAt: z.string().nullable().describe('Timestamp when the address was created')
});

let mapAddress = (data: any) => ({
  addressId: data.id,
  address: data.address,
  unit: data.unit ?? null,
  city: data.city,
  postalCode: data.postal_code,
  countryCode: data.country_code ?? null,
  addressName: data.address_name ?? null,
  accessNotes: data.notes?.access ?? null,
  closingNotes: data.notes?.closing ?? null,
  paidParking: data.parking?.paid_parking ?? null,
  parkingSpot: data.parking?.parking_spot ?? null,
  parkingPayWith: data.parking?.parking_pay_with ?? null,
  maxParkingCost: data.parking?.max_parking_cost ?? null,
  parkingNotes: data.parking?.parking_notes ?? null,
  createdAt: data.created_at ?? null
});

export let listAddresses = SlateTool.create(spec, {
  name: 'List Addresses',
  key: 'list_addresses',
  description: `List all property addresses associated with your TIDY account. Returns addresses sorted by creation date. Use this to find address IDs needed for creating jobs, reservations, or issues.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      addresses: z.array(addressOutputSchema).describe('List of addresses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listAddresses();
    let addresses = (result.data ?? result ?? []).map(mapAddress);

    return {
      output: { addresses },
      message: `Found **${addresses.length}** address(es).`
    };
  })
  .build();

export let getAddress = SlateTool.create(spec, {
  name: 'Get Address',
  key: 'get_address',
  description: `Retrieve detailed information about a specific property address by its ID, including location details, access notes, and parking information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      addressId: z.string().describe('ID of the address to retrieve')
    })
  )
  .output(addressOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getAddress(ctx.input.addressId);
    let address = mapAddress(result);

    return {
      output: address,
      message: `Retrieved address **${address.addressName || address.address}**.`
    };
  })
  .build();

export let createAddress = SlateTool.create(spec, {
  name: 'Create Address',
  key: 'create_address',
  description: `Add a new property address to your TIDY account. Addresses are the foundational entity for scheduling jobs, assigning pros, and managing to-do lists. You can include access notes and parking information.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      address: z.string().describe('Street address (e.g. "123 Main St")'),
      postalCode: z.string().describe('Postal/ZIP code'),
      city: z.string().describe('City name'),
      unit: z.string().optional().describe('Unit or apartment number'),
      countryCode: z.string().optional().describe('Country code (e.g. "US")'),
      addressName: z
        .string()
        .optional()
        .describe('Friendly name for the property (e.g. "Beach House")'),
      accessNotes: z.string().optional().describe('Instructions for accessing the property'),
      closingNotes: z
        .string()
        .optional()
        .describe('Instructions for closing/leaving the property'),
      paidParking: z.boolean().optional().describe('Whether parking is paid'),
      parkingSpot: z.string().optional().describe('Parking spot details'),
      parkingPayWith: z.string().optional().describe('How to pay for parking'),
      maxParkingCost: z.number().optional().describe('Maximum parking cost'),
      parkingNotes: z.string().optional().describe('Additional parking notes')
    })
  )
  .output(addressOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createAddress(ctx.input);
    let address = mapAddress(result);

    return {
      output: address,
      message: `Created address **${address.addressName || address.address}** (ID: ${address.addressId}).`
    };
  })
  .build();

export let updateAddress = SlateTool.create(spec, {
  name: 'Update Address',
  key: 'update_address',
  description: `Update an existing property address. You can modify the address name, access notes, closing notes, and parking details. The street address, unit, postal code, and country code cannot be changed after creation.`,
  constraints: [
    'Cannot update the street address, unit, postal code, or country code. Only name, notes, and parking details can be modified.'
  ]
})
  .input(
    z.object({
      addressId: z.string().describe('ID of the address to update'),
      addressName: z.string().optional().describe('New friendly name for the property'),
      accessNotes: z
        .string()
        .optional()
        .describe('Updated instructions for accessing the property'),
      closingNotes: z
        .string()
        .optional()
        .describe('Updated instructions for closing/leaving the property'),
      paidParking: z.boolean().optional().describe('Whether parking is paid'),
      parkingSpot: z.string().optional().describe('Updated parking spot details'),
      parkingPayWith: z.string().optional().describe('How to pay for parking'),
      maxParkingCost: z.number().optional().describe('Maximum parking cost'),
      parkingNotes: z.string().optional().describe('Additional parking notes')
    })
  )
  .output(addressOutputSchema)
  .handleInvocation(async ctx => {
    let { addressId, ...updateParams } = ctx.input;
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateAddress(addressId, updateParams);
    let address = mapAddress(result);

    return {
      output: address,
      message: `Updated address **${address.addressName || address.address}**.`
    };
  })
  .build();

export let deleteAddress = SlateTool.create(spec, {
  name: 'Delete Address',
  key: 'delete_address',
  description: `Remove a property address from your TIDY account. The address cannot be deleted if it has active jobs associated with it.`,
  constraints: ['Cannot delete an address that has active jobs.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      addressId: z.string().describe('ID of the address to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the address was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteAddress(ctx.input.addressId);

    return {
      output: { deleted: true },
      message: `Deleted address **${ctx.input.addressId}**.`
    };
  })
  .build();
