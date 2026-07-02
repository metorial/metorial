import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDeal = SlateTool.create(spec, {
  name: 'Delete Deal',
  key: 'delete_deal',
  description: `Permanently delete a deal from Pipeline CRM. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      dealId: z.number().describe('ID of the deal to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deal was successfully deleted'),
      dealId: z.number().describe('ID of the deleted deal')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    await client.deleteDeal(ctx.input.dealId);

    return {
      output: {
        deleted: true,
        dealId: ctx.input.dealId
      },
      message: `Deleted deal with ID **${ctx.input.dealId}**`
    };
  })
  .build();
