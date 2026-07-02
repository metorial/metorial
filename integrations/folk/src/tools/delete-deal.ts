import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDeal = SlateTool.create(spec, {
  name: 'Delete Deal',
  key: 'delete_deal',
  description: `Permanently deletes a deal from a Folk group. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group the deal belongs to'),
      objectType: z.string().describe('Deal object type name (e.g. "Deals")'),
      dealId: z.string().describe('ID of the deal to delete')
    })
  )
  .output(
    z.object({
      dealId: z.string().describe('ID of the deleted deal')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteDeal(
      ctx.input.groupId,
      ctx.input.objectType,
      ctx.input.dealId
    );

    return {
      output: {
        dealId: result.id
      },
      message: `Deleted deal ${result.id}`
    };
  })
  .build();
