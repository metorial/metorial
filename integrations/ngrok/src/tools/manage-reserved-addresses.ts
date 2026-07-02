import { SlateTool } from 'slates';
import { z } from 'zod';
import { NgrokClient } from '../lib/client';
import { spec } from '../spec';

let addressOutputSchema = z.object({
  addressId: z.string().describe('Reserved address ID'),
  addr: z.string().describe('TCP address (host:port)'),
  uri: z.string().describe('API resource URI'),
  createdAt: z.string().describe('Creation timestamp'),
  description: z.string().describe('Description'),
  metadata: z.string().describe('Metadata'),
  region: z.string().describe('Region')
});

let mapAddress = (a: any) => ({
  addressId: a.id,
  addr: a.addr || '',
  uri: a.uri || '',
  createdAt: a.created_at || '',
  description: a.description || '',
  metadata: a.metadata || '',
  region: a.region || ''
});

export let listAddresses = SlateTool.create(spec, {
  name: 'List Reserved Addresses',
  key: 'list_addresses',
  description: `List all reserved TCP addresses. Reserved addresses provide stable TCP endpoints for non-HTTP services like SSH or databases. The hostname and port are assigned by ngrok.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      beforeId: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Max results per page')
    })
  )
  .output(
    z.object({
      addresses: z.array(addressOutputSchema),
      nextPageUri: z.string().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let result = await client.listAddresses({
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit
    });
    let addresses = (result.reserved_addrs || []).map(mapAddress);
    return {
      output: { addresses, nextPageUri: result.next_page_uri || null },
      message: `Found **${addresses.length}** reserved address(es).`
    };
  })
  .build();

export let getAddress = SlateTool.create(spec, {
  name: 'Get Reserved Address',
  key: 'get_address',
  description: `Retrieve details of a specific reserved TCP address by its ID.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      addressId: z.string().describe('Reserved address ID (e.g., ra_xxx)')
    })
  )
  .output(addressOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let a = await client.getAddress(ctx.input.addressId);
    return {
      output: mapAddress(a),
      message: `Retrieved reserved address **${a.addr}** (${a.id}).`
    };
  })
  .build();

export let createAddress = SlateTool.create(spec, {
  name: 'Reserve TCP Address',
  key: 'create_address',
  description: `Reserve a new TCP address for non-HTTP traffic. The hostname and port are assigned by ngrok and cannot be chosen. Useful for SSH, database connections, or other TCP services.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      description: z.string().optional().describe('Description (max 255 bytes)'),
      metadata: z.string().optional().describe('Metadata (max 4096 bytes)'),
      region: z
        .enum(['us', 'eu', 'ap', 'au', 'sa', 'jp', 'in'])
        .optional()
        .describe('Region for the address (defaults to "us")')
    })
  )
  .output(addressOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let a = await client.createAddress({
      description: ctx.input.description,
      metadata: ctx.input.metadata,
      region: ctx.input.region
    });
    return {
      output: mapAddress(a),
      message: `Reserved TCP address **${a.addr}** (${a.id}) in region ${a.region}.`
    };
  })
  .build();

export let updateAddress = SlateTool.create(spec, {
  name: 'Update Reserved Address',
  key: 'update_address',
  description: `Update the description or metadata of a reserved TCP address.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      addressId: z.string().describe('Reserved address ID to update'),
      description: z.string().optional().describe('New description'),
      metadata: z.string().optional().describe('New metadata')
    })
  )
  .output(addressOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let a = await client.updateAddress(ctx.input.addressId, {
      description: ctx.input.description,
      metadata: ctx.input.metadata
    });
    return {
      output: mapAddress(a),
      message: `Updated reserved address **${a.addr}** (${a.id}).`
    };
  })
  .build();

export let deleteAddress = SlateTool.create(spec, {
  name: 'Delete Reserved Address',
  key: 'delete_address',
  description: `Release a reserved TCP address. It will no longer receive traffic.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      addressId: z.string().describe('Reserved address ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    await client.deleteAddress(ctx.input.addressId);
    return {
      output: { success: true },
      message: `Deleted reserved address **${ctx.input.addressId}**.`
    };
  })
  .build();
