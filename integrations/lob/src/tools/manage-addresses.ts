import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z.object({
  addressId: z.string().describe('Unique Lob address ID'),
  name: z.string().optional().nullable().describe('Recipient name'),
  company: z.string().optional().nullable().describe('Company name'),
  addressLine1: z.string().describe('First line of the address'),
  addressLine2: z.string().optional().nullable().describe('Second line of the address'),
  addressCity: z.string().optional().nullable().describe('City'),
  addressState: z.string().optional().nullable().describe('State (2-letter code for US)'),
  addressZip: z.string().optional().nullable().describe('ZIP or postal code'),
  addressCountry: z
    .string()
    .optional()
    .nullable()
    .describe('Country code (ISO 3166-1 alpha-2)'),
  phone: z.string().optional().nullable().describe('Phone number'),
  email: z.string().optional().nullable().describe('Email address'),
  description: z.string().optional().nullable().describe('Description of the address'),
  metadata: z
    .record(z.string(), z.string())
    .optional()
    .nullable()
    .describe('Custom metadata key-value pairs'),
  dateCreated: z.string().optional().nullable().describe('Date the address was created'),
  dateModified: z.string().optional().nullable().describe('Date the address was last modified')
});

let mapAddress = (data: any) => ({
  addressId: data.id,
  name: data.name ?? null,
  company: data.company ?? null,
  addressLine1: data.address_line1,
  addressLine2: data.address_line2 ?? null,
  addressCity: data.address_city ?? null,
  addressState: data.address_state ?? null,
  addressZip: data.address_zip ?? null,
  addressCountry: data.address_country ?? null,
  phone: data.phone ?? null,
  email: data.email ?? null,
  description: data.description ?? null,
  metadata: data.metadata ?? null,
  dateCreated: data.date_created ?? null,
  dateModified: data.date_modified ?? null
});

export let createAddress = SlateTool.create(spec, {
  name: 'Create Address',
  key: 'create_address',
  description: `Create a new address in Lob's address book. Addresses can be used as sender or recipient when sending mail pieces. US addresses are automatically verified and standardized.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Recipient name'),
      company: z.string().optional().describe('Company name'),
      addressLine1: z.string().describe('Primary address line (street address, PO Box, etc.)'),
      addressLine2: z
        .string()
        .optional()
        .describe('Secondary address line (apt, suite, etc.)'),
      addressCity: z.string().optional().describe('City'),
      addressState: z.string().optional().describe('State (2-letter code for US)'),
      addressZip: z.string().optional().describe('ZIP or postal code'),
      addressCountry: z
        .string()
        .optional()
        .describe('Country code (ISO 3166-1 alpha-2). Defaults to US.'),
      phone: z.string().optional().describe('Phone number'),
      email: z.string().optional().describe('Email address'),
      description: z.string().optional().describe('Internal description for this address'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Up to 20 custom metadata key-value pairs')
    })
  )
  .output(addressSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createAddress(ctx.input);
    let mapped = mapAddress(result);
    return {
      output: mapped,
      message: `Created address **${mapped.name || mapped.company || mapped.addressLine1}** (${mapped.addressId})`
    };
  });

export let getAddress = SlateTool.create(spec, {
  name: 'Get Address',
  key: 'get_address',
  description: `Retrieve a specific address from Lob's address book by its ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      addressId: z.string().describe('The Lob address ID to retrieve (starts with "adr_")')
    })
  )
  .output(addressSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getAddress(ctx.input.addressId);
    let mapped = mapAddress(result);
    return {
      output: mapped,
      message: `Retrieved address **${mapped.name || mapped.company || mapped.addressLine1}** (${mapped.addressId})`
    };
  });

export let listAddresses = SlateTool.create(spec, {
  name: 'List Addresses',
  key: 'list_addresses',
  description: `List addresses from Lob's address book with optional filtering. Returns a paginated list of saved addresses.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Number of addresses to return (max 100, default 10)'),
      offset: z.number().optional().describe('Number of addresses to skip for pagination'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Filter by metadata key-value pairs')
    })
  )
  .output(
    z.object({
      addresses: z.array(addressSchema).describe('List of addresses'),
      totalCount: z.number().describe('Total number of addresses matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listAddresses({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      metadata: ctx.input.metadata
    });
    let addresses = (result.data || []).map(mapAddress);
    return {
      output: {
        addresses,
        totalCount: result.total_count ?? result.count ?? addresses.length
      },
      message: `Found **${addresses.length}** addresses`
    };
  });

export let deleteAddress = SlateTool.create(spec, {
  name: 'Delete Address',
  key: 'delete_address',
  description: `Delete an address from Lob's address book. This permanently removes the address.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      addressId: z.string().describe('The Lob address ID to delete (starts with "adr_")')
    })
  )
  .output(
    z.object({
      addressId: z.string().describe('ID of the deleted address'),
      deleted: z.boolean().describe('Whether the address was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteAddress(ctx.input.addressId);
    return {
      output: {
        addressId: result.id,
        deleted: result.deleted ?? true
      },
      message: `Deleted address **${ctx.input.addressId}**`
    };
  });
