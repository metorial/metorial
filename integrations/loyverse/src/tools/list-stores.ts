import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, joinIds } from '../lib/client';
import { spec } from '../spec';

let storeSchema = z.object({
  storeId: z.string().describe('Store ID'),
  storeName: z.string().optional().describe('Store name'),
  address: z.string().nullable().optional().describe('Address'),
  city: z.string().nullable().optional().describe('City'),
  region: z.string().nullable().optional().describe('State or region'),
  postalCode: z.string().nullable().optional().describe('Postal code'),
  countryCode: z.string().nullable().optional().describe('Two-letter country code'),
  phoneNumber: z.string().nullable().optional().describe('Phone number'),
  description: z.string().nullable().optional().describe('Store description'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional()
});

export let listStores = SlateTool.create(spec, {
  name: 'List Stores',
  key: 'list_stores',
  description: `Retrieve all store locations. Store IDs are needed for receipts, inventory, and shifts.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      storeIds: z.array(z.string()).optional().describe('Only return stores with these IDs'),
      createdAtMin: z
        .string()
        .optional()
        .describe('Only return stores created at or after this ISO 8601 UTC timestamp'),
      createdAtMax: z
        .string()
        .optional()
        .describe('Only return stores created at or before this ISO 8601 UTC timestamp'),
      updatedAtMin: z
        .string()
        .optional()
        .describe('Only return stores updated at or after this ISO 8601 UTC timestamp'),
      updatedAtMax: z
        .string()
        .optional()
        .describe('Only return stores updated at or before this ISO 8601 UTC timestamp'),
      limit: z.number().min(1).max(250).optional().describe('Number of stores to return'),
      cursor: z.string().optional().describe('Pagination cursor'),
      showDeleted: z.boolean().optional().describe('Include deleted stores')
    })
  )
  .output(
    z.object({
      stores: z.array(storeSchema),
      cursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listStores({
      storeIds: joinIds(ctx.input.storeIds),
      createdAtMin: ctx.input.createdAtMin,
      createdAtMax: ctx.input.createdAtMax,
      updatedAtMin: ctx.input.updatedAtMin,
      updatedAtMax: ctx.input.updatedAtMax,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      showDeleted: ctx.input.showDeleted
    });

    let stores = (result.stores ?? []).map((s: any) => ({
      storeId: s.id,
      storeName: s.name,
      address: s.address,
      city: s.city,
      region: s.state ?? s.region,
      postalCode: s.postal_code,
      countryCode: s.country ?? s.country_code,
      phoneNumber: s.phone_number,
      description: s.description,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      deletedAt: s.deleted_at
    }));

    return {
      output: { stores, cursor: result.cursor },
      message: `Retrieved **${stores.length}** store(s).`
    };
  })
  .build();
