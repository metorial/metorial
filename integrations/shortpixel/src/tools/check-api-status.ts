import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShortPixelClient } from '../lib/client';
import { spec } from '../spec';

export let checkApiStatus = SlateTool.create(spec, {
  name: 'Check API Status',
  key: 'check_api_status',
  description: `Retrieve the current credit usage and quota information for the ShortPixel API key.
Returns monthly and one-time credit counts including how many calls have been made and the total quota available.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      monthlyCallsMade: z
        .number()
        .describe('Number of paid API calls made from the monthly quota'),
      monthlyCallsQuota: z.number().describe('Total monthly API call quota'),
      oneTimeCallsMade: z
        .number()
        .describe('Number of paid API calls made from one-time credits'),
      oneTimeCallsQuota: z.number().describe('Total one-time API call quota'),
      totalCallsMade: z.number().describe('Total numeric API calls made'),
      totalCallsQuota: z.number().describe('Total numeric API calls quota')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShortPixelClient({ token: ctx.auth.token });

    let status = await client.getApiStatus();

    let output = {
      monthlyCallsMade: status.APICallsMade ?? 0,
      monthlyCallsQuota: status.APICallsQuota ?? 0,
      oneTimeCallsMade: status.APICallsMadeOneTime ?? 0,
      oneTimeCallsQuota: status.APICallsQuotaOneTime ?? 0,
      totalCallsMade: status.APICallsMadeNumeric ?? 0,
      totalCallsQuota: status.APICallsQuotaNumeric ?? 0
    };

    let remainingMonthly = output.monthlyCallsQuota - output.monthlyCallsMade;
    let remainingOneTime = output.oneTimeCallsQuota - output.oneTimeCallsMade;

    return {
      output,
      message: `**Monthly credits:** ${output.monthlyCallsMade}/${output.monthlyCallsQuota} used (${remainingMonthly} remaining)\n**One-time credits:** ${output.oneTimeCallsMade}/${output.oneTimeCallsQuota} used (${remainingOneTime} remaining)`
    };
  })
  .build();
