import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let deleteCoupon = SlateTool.create(spec, {
  name: 'Delete Coupon',
  key: 'delete_coupon',
  description: `Deletes a coupon by its ID. This action is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      couponId: z.string().describe('UUID of the coupon to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);
    await client.deleteCoupon(ctx.input.couponId);

    return {
      output: { success: true },
      message: `Coupon **${ctx.input.couponId}** deleted successfully.`
    };
  })
  .build();
