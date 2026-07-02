import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getDeal = SlateTool.create(spec, {
  name: 'Get Deal',
  key: 'get_deal',
  description: `Retrieve a deal by its ID from Salesmate. Returns all fields including pipeline stage, value, and associated contacts/companies.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dealId: z.string().describe('ID of the deal to retrieve')
    })
  )
  .output(
    z.object({
      deal: z.record(z.string(), z.unknown()).describe('Full deal record with all fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getDeal(ctx.input.dealId);
    let deal = result?.Data ?? result;

    return {
      output: { deal },
      message: `Retrieved deal \`${ctx.input.dealId}\`.`
    };
  })
  .build();
