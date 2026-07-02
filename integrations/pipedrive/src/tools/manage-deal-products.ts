import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { pipedriveServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageDealProducts = SlateTool.create(spec, {
  name: 'Manage Deal Products',
  key: 'manage_deal_products',
  description: `Attach, update, or remove products from deals in Pipedrive. Use this to manage which products are associated with a deal, including quantity, pricing, and discounts.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'update', 'remove', 'list']).describe('Action to perform'),
      dealId: z.number().describe('Deal ID to manage products for'),
      productId: z.number().optional().describe('Product ID to attach (required for add)'),
      dealProductId: z
        .number()
        .optional()
        .describe('Deal-product attachment ID (required for update/remove)'),
      itemPrice: z.number().optional().describe('Price per unit'),
      quantity: z.number().optional().describe('Quantity of the product'),
      discount: z.number().optional().describe('Discount amount or percentage'),
      discountType: z
        .enum(['percentage', 'amount'])
        .optional()
        .describe('How discount is applied'),
      comments: z.string().optional().describe('Comments for the product attachment'),
      enabledFlag: z
        .boolean()
        .optional()
        .describe('Whether the product is enabled on the deal')
    })
  )
  .output(
    z.object({
      dealId: z.number().describe('Deal ID'),
      products: z
        .array(
          z.object({
            dealProductId: z.number().describe('Deal-product attachment ID'),
            productId: z.number().describe('Product ID'),
            name: z.string().optional().describe('Product name'),
            itemPrice: z.number().optional().describe('Unit price'),
            quantity: z.number().optional().describe('Quantity'),
            sum: z.number().optional().describe('Total sum'),
            discount: z.number().optional().describe('Discount'),
            discountType: z.string().optional().describe('Discount type'),
            enabledFlag: z.boolean().optional().describe('Whether enabled')
          })
        )
        .optional()
        .describe('Products attached to the deal'),
      deleted: z.boolean().optional().describe('Whether a product was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'list') {
      let result = await client.getDealProducts(ctx.input.dealId);
      let products = (result?.data || []).map((p: any) => ({
        dealProductId: p.id,
        productId: p.product_id,
        name: p.name,
        itemPrice: p.item_price,
        quantity: p.quantity,
        sum: p.sum,
        discount: p.discount,
        discountType: p.discount_type,
        enabledFlag: p.enabled_flag
      }));
      return {
        output: { dealId: ctx.input.dealId, products },
        message: `Deal **#${ctx.input.dealId}** has **${products.length}** product(s) attached.`
      };
    }

    if (ctx.input.action === 'remove') {
      if (!ctx.input.dealProductId)
        throw pipedriveServiceError('dealProductId is required for remove');
      await client.deleteDealProduct(ctx.input.dealId, ctx.input.dealProductId);
      return {
        output: { dealId: ctx.input.dealId, deleted: true },
        message: `Product attachment **#${ctx.input.dealProductId}** removed from deal **#${ctx.input.dealId}**.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.productId) body.product_id = ctx.input.productId;
    if (ctx.input.itemPrice !== undefined) body.item_price = ctx.input.itemPrice;
    if (ctx.input.quantity !== undefined) body.quantity = ctx.input.quantity;
    if (ctx.input.discount !== undefined) body.discount = ctx.input.discount;
    if (ctx.input.discountType) body.discount_type = ctx.input.discountType;
    if (ctx.input.comments) body.comments = ctx.input.comments;
    if (ctx.input.enabledFlag !== undefined) body.enabled_flag = ctx.input.enabledFlag ? 1 : 0;

    if (ctx.input.action === 'add') {
      let result = await client.addDealProduct(ctx.input.dealId, body);
      let p = result?.data;
      return {
        output: {
          dealId: ctx.input.dealId,
          products: p
            ? [
                {
                  dealProductId: p.id,
                  productId: p.product_id,
                  name: p.name,
                  itemPrice: p.item_price,
                  quantity: p.quantity,
                  sum: p.sum,
                  discount: p.discount,
                  discountType: p.discount_type,
                  enabledFlag: p.enabled_flag
                }
              ]
            : []
        },
        message: `Product added to deal **#${ctx.input.dealId}**.`
      };
    }

    // update
    if (!ctx.input.dealProductId)
      throw pipedriveServiceError('dealProductId is required for update');
    let result = await client.updateDealProduct(
      ctx.input.dealId,
      ctx.input.dealProductId,
      body
    );
    let p = result?.data;
    return {
      output: {
        dealId: ctx.input.dealId,
        products: p
          ? [
              {
                dealProductId: p.id,
                productId: p.product_id,
                name: p.name,
                itemPrice: p.item_price,
                quantity: p.quantity,
                sum: p.sum,
                discount: p.discount,
                discountType: p.discount_type,
                enabledFlag: p.enabled_flag
              }
            ]
          : []
      },
      message: `Product attachment **#${ctx.input.dealProductId}** updated on deal **#${ctx.input.dealId}**.`
    };
  });
