import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCryptoInvestors = SlateTool.create(spec, {
  name: 'Get Crypto Investors',
  key: 'get_crypto_investors',
  description: `Retrieve a list of notable crypto investors and their scores, including ROI averages, ROI medians, round counts, and social links. Useful for tracking smart money and institutional investor activity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
      investors: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of crypto investor records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCryptoInvestors({
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let investors = result?.data ?? [];

    return {
      output: { investors },
      message: `Retrieved **${investors.length}** crypto investor(s).`
    };
  })
  .build();
