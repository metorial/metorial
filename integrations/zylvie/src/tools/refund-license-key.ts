import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { rawResponseSchema } from '../lib/response';
import { spec } from '../spec';

export let refundLicenseKey = SlateTool.create(spec, {
  name: 'Refund License Key',
  key: 'refund_license_key',
  description: `Refund (invalidate) a software license key. Marks the key as refunded so it is no longer valid. Returns an error if the key has already been refunded.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      licenseKey: z
        .string()
        .describe('The license key (generated UUID or uploaded custom code) to refund')
    })
  )
  .output(
    z.object({
      raw: rawResponseSchema,
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

    let result = await client.refundLicenseKey(ctx.input.licenseKey);

    return {
      output: {
        raw: result,
        key: result.key as string,
        created: result.created as number,
        redeemed: result.redeemed as boolean,
        redeemedAt: result.redeemed_at as number | null,
        refunded: result.refunded as boolean,
        refundedAt: result.refunded_at as number | null
      },
      message: `License key \`${result.key}\` has been **refunded** (invalidated).`
    };
  })
  .build();
