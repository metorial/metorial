import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyLicenseKey = SlateTool.create(spec, {
  name: 'Verify License Key',
  key: 'verify_license_key',
  description: `Verify a software license key's validity for a specific product. Returns the key's status including whether it has been redeemed or refunded, along with the buyer's email.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.string().describe('Product ID for which the license key was issued'),
      licenseKey: z.string().describe('The license key (UUID) to verify')
    })
  )
  .output(
    z.object({
      key: z.string().describe('The license key'),
      productId: z.string().describe('Associated product ID'),
      buyerEmail: z.string().describe('Email of the purchaser'),
      created: z.number().describe('Unix timestamp of creation'),
      redeemed: z.boolean().describe('Whether the key has been redeemed'),
      redeemedAt: z.number().nullable().describe('Unix timestamp of redemption'),
      refunded: z.boolean().describe('Whether the key has been refunded'),
      refundedAt: z.number().nullable().describe('Unix timestamp of refund')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.verifyLicenseKey(ctx.input.productId, ctx.input.licenseKey);

    return {
      output: {
        key: result.key as string,
        productId: result.product_id as string,
        buyerEmail: result.buyer_email as string,
        created: result.created as number,
        redeemed: result.redeemed as boolean,
        redeemedAt: (result.redeemed_at as number | null) ?? null,
        refunded: result.refunded as boolean,
        refundedAt: (result.refunded_at as number | null) ?? null
      },
      message: `License key \`${result.key}\` is **${result.refunded ? 'refunded' : result.redeemed ? 'redeemed' : 'valid (not yet redeemed)'}** for product \`${result.product_id}\`.`
    };
  })
  .build();
