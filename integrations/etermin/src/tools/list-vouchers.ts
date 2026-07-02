import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listVouchers = SlateTool.create(spec, {
  name: 'List Vouchers',
  key: 'list_vouchers',
  description: `Retrieve all vouchers from the eTermin account. Returns voucher details including code, value, currency, usage limits, and expiration dates.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      vouchers: z.array(z.record(z.string(), z.any())).describe('List of voucher records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.listVouchers();

    let vouchers = Array.isArray(result) ? result : [result];

    return {
      output: { vouchers },
      message: `Found **${vouchers.length}** voucher(s).`
    };
  })
  .build();
