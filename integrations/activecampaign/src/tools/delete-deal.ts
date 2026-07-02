import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDeal = SlateTool.create(spec, {
  name: 'Delete Deal',
  key: 'delete_deal',
  description: `Permanently deletes a deal from ActiveCampaign.`,
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
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    await client.deleteDeal(ctx.input.dealId);

    return {
      output: { deleted: true },
      message: `Deal (ID: ${ctx.input.dealId}) has been deleted.`
    };
  })
  .build();
