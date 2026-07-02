import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let shopSchema = z
  .object({
    shopUuid: z.string().describe('UUID of the shop'),
    name: z.string().optional().describe('Shop name'),
    shopType: z.string().optional().describe('Shop type (physical or web)'),
    reference: z.string().optional().describe('External reference for the shop')
  })
  .passthrough();

export let listShops = SlateTool.create(spec, {
  name: 'List Shops',
  key: 'list_shops',
  description: `List all shops connected to the account. Shops represent physical locations or web shops and are required for many operations like awarding credits, redeeming vouchers, and gift card transactions.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      shops: z.array(shopSchema).describe('List of shops')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listShops();
    let shops = (result.data || []).map((s: any) => ({
      shopUuid: s.uuid,
      name: s.name,
      shopType: s.type,
      reference: s.reference,
      ...s
    }));

    return {
      output: { shops },
      message: `Retrieved **${shops.length}** shop(s).`
    };
  })
  .build();
