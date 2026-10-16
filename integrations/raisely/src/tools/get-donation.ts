import { SlateTool } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { sanitizeRaiselyLookup } from '../lib/output';
import { spec } from '../spec';

export let getDonation = SlateTool.create(spec, {
  name: 'Get Donation',
  key: 'get_donation',
  description:
    'Retrieve one donation by UUID, including its current status and available donor details. Use list_donations to discover donation UUIDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      donationUuid: z.string().describe('Donation UUID from list_donations'),
      includePrivateData: z
        .boolean()
        .optional()
        .describe('Include private/custom field data when permitted')
    })
  )
  .output(z.object({ donation: z.record(z.string(), z.any()) }))
  .handleInvocation(async ctx => {
    let client = new RaiselyClient({ token: ctx.auth.token });
    let result = await client.getDonation(ctx.input.donationUuid, {
      private: ctx.input.includePrivateData
    });
    return {
      output: { donation: sanitizeRaiselyLookup(result.data, 'donation') },
      message: `Retrieved donation **${ctx.input.donationUuid}**.`
    };
  })
  .build();
