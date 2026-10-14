import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let promotionSchema = z.object({
  code: z.string().optional().describe('Coupon/promotion code'),
  description: z.string().optional().describe('Promotion description'),
  usage: z.number().optional().describe('Number of times the promotion has been used')
});

export let listPromotionsTool = SlateTool.create(spec, {
  name: 'List Promotions',
  key: 'list_promotions',
  description: `Retrieve all promotion/coupon codes in the account with their usage counts. Supports pagination for large result sets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      promotions: z.array(promotionSchema).describe('List of promotions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let data = await client.listPromotions({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let promotions = Array.isArray(data) ? data.map(mapPromotion) : [];

    return {
      output: { promotions },
      message: `Found **${promotions.length}** promotion(s).`
    };
  })
  .build();

export let getPromotionTool = SlateTool.create(spec, {
  name: 'Get Promotion',
  key: 'get_promotion',
  description: `Retrieve details and usage information for a specific promotion/coupon code.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      promotionCode: z.string().describe('The coupon code to look up')
    })
  )
  .output(promotionSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let data = await client.getPromotion(ctx.input.promotionCode);
    let promotion = mapPromotion(data);

    return {
      output: promotion,
      message: `Retrieved promotion **${ctx.input.promotionCode}** (used **${promotion.usage ?? 0}** time(s)).`
    };
  })
  .build();

export let duplicatePromotionTool = SlateTool.create(spec, {
  name: 'Duplicate Promotion',
  key: 'duplicate_promotion',
  description: `Create a new promotion/coupon code by duplicating an existing one. The new code inherits the template's configuration (discount amount, conditions, etc.) but has a new code string.`
})
  .input(
    z.object({
      newCode: z.string().describe('The new promotion code to create'),
      templateCode: z.string().describe('The existing promotion code to use as a template')
    })
  )
  .output(promotionSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let data = await client.duplicatePromotion(ctx.input.newCode, ctx.input.templateCode);
    let promotion = mapPromotion(data);

    return {
      output: promotion,
      message: `Created promotion **${ctx.input.newCode}** based on template **${ctx.input.templateCode}**.`
    };
  })
  .build();

let mapPromotion = (data: any): any => {
  if (!data) return {};
  return {
    code: data.code ?? undefined,
    description: data.description ?? undefined,
    usage: data.usage != null ? Number(data.usage) : undefined
  };
};

export let deletePromotionTool = SlateTool.create(spec, {
  name: 'Delete Promotion',
  key: 'delete_promotion',
  description:
    'Delete a promotion or coupon code. Existing bookings keep their discount; the code can no longer be used for new bookings.',
  tags: { destructive: true }
})
  .input(
    z.object({
      promotionCode: z
        .string()
        .min(1)
        .describe('Coupon code to delete. Call list_promotions to discover codes.')
    })
  )
  .output(z.object({ deleted: z.boolean(), code: z.string() }))
  .handleInvocation(async ctx => {
    await new Client(ctx.auth).deletePromotion(ctx.input.promotionCode);
    return {
      output: { deleted: true, code: ctx.input.promotionCode },
      message: `Deleted promotion **${ctx.input.promotionCode}**.`
    };
  })
  .build();
