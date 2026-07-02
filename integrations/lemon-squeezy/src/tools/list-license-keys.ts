import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLicenseKeysTool = SlateTool.create(spec, {
  name: 'List License Keys',
  key: 'list_license_keys',
  description: `Retrieve license keys from your Lemon Squeezy store. Supports filtering by store, order, or product.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      storeId: z.string().optional().describe('Filter by store ID'),
      orderId: z.string().optional().describe('Filter by order ID'),
      productId: z.string().optional().describe('Filter by product ID'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      licenseKeys: z.array(
        z.object({
          licenseKeyId: z.string(),
          storeId: z.number(),
          customerId: z.number(),
          orderId: z.number(),
          productId: z.number(),
          keyShort: z.string(),
          status: z.string(),
          statusFormatted: z.string(),
          activationLimit: z.number(),
          activationUsage: z.number(),
          disabled: z.boolean(),
          expiresAt: z.string().nullable(),
          createdAt: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listLicenseKeys({
      storeId: ctx.input.storeId,
      orderId: ctx.input.orderId,
      productId: ctx.input.productId,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let licenseKeys = (response.data || []).map((lk: any) => ({
      licenseKeyId: lk.id,
      storeId: lk.attributes.store_id,
      customerId: lk.attributes.customer_id,
      orderId: lk.attributes.order_id,
      productId: lk.attributes.product_id,
      keyShort: lk.attributes.key_short,
      status: lk.attributes.status,
      statusFormatted: lk.attributes.status_formatted,
      activationLimit: lk.attributes.activation_limit,
      activationUsage: lk.attributes.activation_usage,
      disabled: lk.attributes.disabled,
      expiresAt: lk.attributes.expires_at,
      createdAt: lk.attributes.created_at
    }));

    let hasMore =
      !!response.meta?.page?.lastPage &&
      response.meta?.page?.currentPage < response.meta?.page?.lastPage;

    return {
      output: { licenseKeys, hasMore },
      message: `Found **${licenseKeys.length}** license key(s).`
    };
  })
  .build();
