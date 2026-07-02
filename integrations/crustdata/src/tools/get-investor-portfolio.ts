import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrustdataClient } from '../lib/client';
import { spec } from '../spec';

export let getInvestorPortfolio = SlateTool.create(spec, {
  name: 'Get Investor Portfolio',
  key: 'get_investor_portfolio',
  description: `Retrieve investment holdings and portfolio companies for a specific investor.
Returns portfolio performance metrics and details about companies in the investor's portfolio.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      investorName: z
        .string()
        .describe(
          'Name of the investor or investment firm (e.g., "Sequoia Capital", "Y Combinator").'
        )
    })
  )
  .output(
    z.object({
      portfolio: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of portfolio company records.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CrustdataClient(ctx.auth.token);

    let result = await client.getInvestorPortfolio({
      investorName: ctx.input.investorName
    });

    let portfolio = Array.isArray(result) ? result : (result.data ?? result.portfolio ?? []);

    return {
      output: { portfolio },
      message: `Retrieved **${portfolio.length}** portfolio companies for "${ctx.input.investorName}".`
    };
  })
  .build();
