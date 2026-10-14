import { SlateTool } from 'slates';
import { z } from 'zod';
import { SemrushAnalyticsClient } from '../lib/client';
import { spec } from '../spec';

export let getApiUnitBalance = SlateTool.create(spec, {
  name: 'Get API Unit Balance',
  key: 'get_api_unit_balance',
  description:
    'Check the remaining Standard API units before requesting SEO reports. This read-only request is free and requires an API Key connection.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(z.object({ remainingUnits: z.number().describe('Remaining Standard API units') }))
  .handleInvocation(async ctx => {
    let client = new SemrushAnalyticsClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });
    let remainingUnits = await client.getApiUnitBalance();
    return {
      output: { remainingUnits },
      message: `${remainingUnits} Standard API units remain.`
    };
  })
  .build();
