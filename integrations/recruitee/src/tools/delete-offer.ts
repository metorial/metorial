import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';
export let deleteOffer = SlateTool.create(spec, {
  name: 'Delete Job Offer',
  key: 'delete_offer',
  description:
    'Delete an exact job offer or talent pool, then verify that its detail endpoint reports it absent. This does not guarantee erasure of candidate profiles, retained history, or audit records.',
  tags: { readOnly: false }
})
  .input(z.object({ offerId: z.number().describe('Exact offer ID to delete') }))
  .output(
    z.object({
      offerId: z.number(),
      deleted: z.boolean(),
      retainedHistoryPossible: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    const client = await RecruiteeClient.forContext(ctx);
    const result = await client.deleteOffer(ctx.input.offerId);
    return {
      output: { ...result, retainedHistoryPossible: true },
      message: `Confirmed offer ${result.offerId} is no longer readable. Related history may remain.`
    };
  })
  .build();
