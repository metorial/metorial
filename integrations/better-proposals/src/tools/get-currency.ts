import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrency = SlateTool.create(spec, {
  name: 'Get Currency',
  key: 'get_currency',
  description:
    'Retrieves a currency, including its code and supported payment providers. Call list_currencies to discover currency IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      currencyId: z.string().describe('Currency ID. Call list_currencies to discover IDs.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      currency: z.any().describe('Currency details')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getCurrency(ctx.input.currencyId);
    return {
      output: { status: result.status, currency: result.data },
      message: `Retrieved currency **${ctx.input.currencyId}**.`
    };
  })
  .build();
