import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDeal = SlateTool.create(spec, {
  name: 'Delete Deal',
  key: 'delete_deal',
  description: `Deletes a deal from Spoki. Permanently removes the sales opportunity from the pipeline.`,
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
      dealId: z.string().describe('ID of the deleted deal'),
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info(`Deleting deal ${ctx.input.dealId}`);
    await client.deleteDeal(ctx.input.dealId);

    return {
      output: {
        dealId: ctx.input.dealId,
        success: true
      },
      message: `Deleted deal **${ctx.input.dealId}**`
    };
  })
  .build();
