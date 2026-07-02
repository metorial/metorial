import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let redeemLicenseKey = SlateTool.create(spec, {
  name: 'Redeem License Key',
  key: 'redeem_license_key',
  description: `Redeem (activate) a software license key. Marks the key as activated so it cannot be redeemed again. Returns an error if the key has already been redeemed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      licenseKey: z.string().describe('The license key (UUID) to redeem')
    })
  )
  .output(
    z.object({
      key: z.string().describe('The license key'),
      created: z.number().describe('Unix timestamp of creation'),
      redeemed: z.boolean().describe('Whether the key has been redeemed'),
      redeemedAt: z.number().nullable().describe('Unix timestamp of redemption'),
      refunded: z.boolean().describe('Whether the key has been refunded'),
      refundedAt: z.number().nullable().describe('Unix timestamp of refund')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.redeemLicenseKey(ctx.input.licenseKey);

    return {
      output: {
        key: result.key as string,
        created: result.created as number,
        redeemed: result.redeemed as boolean,
        redeemedAt: (result.redeemed_at as number | null) ?? null,
        refunded: result.refunded as boolean,
        refundedAt: (result.refunded_at as number | null) ?? null
      },
      message: `License key \`${result.key}\` has been **redeemed** successfully.`
    };
  })
  .build();
