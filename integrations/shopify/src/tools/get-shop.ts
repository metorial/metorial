import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

export let getShop = SlateTool.create(spec, {
  name: 'Get Shop',
  key: 'get_shop',
  description: `Retrieve the store's details including name, domain, email, currency, timezone, and plan information.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      shopId: z.string(),
      name: z.string(),
      email: z.string(),
      domain: z.string(),
      myshopifyDomain: z.string(),
      currency: z.string(),
      timezone: z.string(),
      country: z.string(),
      province: z.string(),
      city: z.string(),
      address1: z.string().nullable(),
      phone: z.string().nullable(),
      planName: z.string(),
      weightUnit: z.string(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let shop = await client.getShop();

    return {
      output: {
        shopId: String(shop.id),
        name: shop.name,
        email: shop.email,
        domain: shop.domain,
        myshopifyDomain: shop.myshopify_domain,
        currency: shop.currency,
        timezone: shop.iana_timezone || shop.timezone,
        country: shop.country_name || shop.country,
        province: shop.province,
        city: shop.city,
        address1: shop.address1,
        phone: shop.phone,
        planName: shop.plan_name,
        weightUnit: shop.weight_unit,
        createdAt: shop.created_at,
        updatedAt: shop.updated_at
      },
      message: `Store **${shop.name}** (${shop.myshopify_domain}) — ${shop.plan_name} plan, ${shop.currency} currency.`
    };
  })
  .build();
