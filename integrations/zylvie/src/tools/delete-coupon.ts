import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCoupon = SlateTool.create(spec, {
  name: 'Delete Coupon',
  key: 'delete_coupon',
  description: `Delete a coupon from your Zylvie store. If the coupon has been used in paid transactions, it will be archived instead of deleted (marked as inactive).`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      couponId: z.string().describe('ID of the coupon to delete')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the operation'),
      message: z.string().describe('Result message from the server')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteCoupon(ctx.input.couponId);

    return {
      output: {
        status: result.status,
        message: result.message
      },
      message: `${result.message} (coupon ID: \`${ctx.input.couponId}\`).`
    };
  })
  .build();
