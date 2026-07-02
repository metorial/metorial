import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDeal = SlateTool.create(spec, {
  name: 'Delete Deal',
  key: 'delete_deal',
  description: `Permanently delete a deal from CentralStationCRM by its ID. This action cannot be undone.`,
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
      dealId: z.number().describe('ID of the deleted deal'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    await client.deleteDeal(ctx.input.dealId);

    return {
      output: {
        dealId: ctx.input.dealId,
        deleted: true
      },
      message: `Deleted deal with ID **${ctx.input.dealId}**.`
    };
  })
  .build();
