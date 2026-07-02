import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let storeSchema = z.object({
  storeId: z.string().describe('Store ID'),
  storeName: z.string().optional().describe('Store name'),
  address: z.string().nullable().optional().describe('Address'),
  city: z.string().nullable().optional().describe('City'),
  region: z.string().nullable().optional().describe('Region'),
  postalCode: z.string().nullable().optional().describe('Postal code'),
  countryCode: z.string().nullable().optional().describe('Country code'),
  phoneNumber: z.string().nullable().optional().describe('Phone number'),
  description: z.string().nullable().optional().describe('Store description'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let listStores = SlateTool.create(spec, {
  name: 'List Stores',
  key: 'list_stores',
  description: `Retrieve all store locations and their configurations.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().min(1).max(250).optional(),
      cursor: z.string().optional()
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
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let stores = (result.stores ?? []).map((s: any) => ({
      storeId: s.id,
      storeName: s.name,
      address: s.address,
      city: s.city,
      region: s.region,
      postalCode: s.postal_code,
      countryCode: s.country_code,
      phoneNumber: s.phone_number,
      description: s.description,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    return {
      output: { stores, cursor: result.cursor },
      message: `Retrieved **${stores.length}** store(s).`
    };
  })
  .build();
