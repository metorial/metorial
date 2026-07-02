import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFinancialData = SlateTool.create(spec, {
  name: 'Get Financial Data',
  key: 'get_financial_data',
  description: `Access comprehensive financial data for a website as listed on BuiltWith. Returns financial metrics and company data associated with the domain.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain to get financial data for (e.g., "example.com")')
    })
  )
  .output(
    z.object({
      financialData: z.any().describe('Financial data associated with the domain')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.financial(ctx.input.domain);

    return {
      output: {
        financialData: data
      },
      message: `Retrieved financial data for **${ctx.input.domain}**.`
    };
  });
