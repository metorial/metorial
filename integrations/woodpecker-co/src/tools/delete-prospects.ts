import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteProspects = SlateTool.create(spec, {
  name: 'Delete Prospects',
  key: 'delete_prospects',
  description: `Remove prospects from the Woodpecker database by their IDs. This permanently deletes the prospect records.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      prospectIds: z.array(z.number()).min(1).describe('IDs of prospects to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    await client.deleteProspects(ctx.input.prospectIds);

    return {
      output: { deleted: true },
      message: `Deleted **${ctx.input.prospectIds.length}** prospect(s).`
    };
  })
  .build();
