import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let promotionSchema = z
  .object({
    promotionUuid: z.string().describe('UUID of the promotion'),
    name: z.string().optional().describe('Promotion name'),
    description: z.string().optional().describe('Promotion description'),
    voucherLimit: z.number().optional().describe('Maximum number of vouchers'),
    limitPerContact: z.number().optional().describe('Maximum vouchers per contact'),
    expirationDuration: z.number().optional().describe('Voucher expiration duration in days')
  })
  .passthrough();

export let listPromotions = SlateTool.create(spec, {
  name: 'List Promotions',
  key: 'list_promotions',
  description: `List all promotions in the account. Promotions define voucher campaigns and are required when creating vouchers. Optionally retrieve a single promotion by UUID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      promotionUuid: z
        .string()
        .optional()
        .describe('Get a specific promotion by UUID instead of listing all')
    })
  )
  .output(
    z.object({
      promotions: z.array(promotionSchema).optional().describe('List of promotions'),
      promotion: promotionSchema
        .optional()
        .describe('Single promotion (when promotionUuid is provided)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.promotionUuid) {
      let result = await client.getPromotion(ctx.input.promotionUuid);
      let p = result.data || result;
      return {
        output: {
          promotion: {
            promotionUuid: p.uuid,
            name: p.name,
            description: p.description,
            voucherLimit: p.voucher_limit,
            limitPerContact: p.limit_per_contact,
            expirationDuration: p.expiration_duration,
            ...p
          }
        },
        message: `Retrieved promotion **${p.name || p.uuid}**.`
      };
    }

    let result = await client.listPromotions();
    let promotions = (result.data || []).map((p: any) => ({
      promotionUuid: p.uuid,
      name: p.name,
      description: p.description,
      voucherLimit: p.voucher_limit,
      limitPerContact: p.limit_per_contact,
      expirationDuration: p.expiration_duration,
      ...p
    }));

    return {
      output: { promotions },
      message: `Retrieved **${promotions.length}** promotion(s).`
    };
  })
  .build();
