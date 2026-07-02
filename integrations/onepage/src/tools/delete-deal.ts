import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDeal = SlateTool.create(spec, {
  name: 'Delete Deal',
  key: 'delete_deal',
  description: `Delete a deal from OnePageCRM by its ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      dealId: z.string().describe('ID of the deal to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deal was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    await client.deleteDeal(ctx.input.dealId);

    return {
      output: { deleted: true },
      message: `Deleted deal ${ctx.input.dealId}.`
    };
  })
  .build();
