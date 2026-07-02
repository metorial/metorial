import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkCompliance = SlateTool.create(spec, {
  name: 'Check Compliance',
  key: 'check_compliance',
  description: `Verify whether a list of cell numbers is compliant with a campaign's targeting criteria before sending. Returns a per-number compliance status. This is a **paid endpoint** costing 0.14 credits per cell number.`,
  constraints: [
    'Costs 0.14 credits per cell number queried',
    'Returns HTTP 402 if you have insufficient balance'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cells: z.array(z.string()).describe('Array of cell numbers (MSISDNs) to check'),
      country: z.string().describe('Country code for the cell numbers (e.g. "ZA", "US")'),
      campaignId: z
        .string()
        .optional()
        .describe(
          'Campaign ID to check against. If omitted, only global opt-outs are checked.'
        )
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            cell: z.string().describe('Cell number checked'),
            canSend: z.boolean().describe('Whether sending to this number is compliant')
          })
        )
        .describe('Per-number compliance results'),
      creditsUsed: z.number().describe('Number of credits consumed by this check'),
      campaignId: z.string().optional().describe('Campaign ID checked against, if provided')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.checkCompliance({
      cells: ctx.input.cells,
      country: ctx.input.country,
      campaignId: ctx.input.campaignId
    });

    let results = (result.data?.results ?? []).map((r: any) => ({
      cell: r.cell,
      canSend: r.can_send
    }));
    let creditsUsed = result.data?.credits_used ?? 0;

    let compliant = results.filter((r: { canSend: boolean }) => r.canSend).length;
    return {
      output: {
        results,
        creditsUsed,
        campaignId: result.data?.campaign_id
      },
      message: `Checked **${results.length}** number(s): **${compliant}** compliant, **${results.length - compliant}** non-compliant. Credits used: ${creditsUsed}.`
    };
  })
  .build();
