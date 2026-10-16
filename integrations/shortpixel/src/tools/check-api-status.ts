import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShortPixelClient } from '../lib/client';
import { readNumber, readOptionalNumber } from '../lib/responses';
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
      totalCallsMade: z
        .number()
        .optional()
        .describe('Total numeric API calls made, when supplied'),
      totalCallsQuota: z
        .number()
        .optional()
        .describe('Total numeric API calls quota, when supplied')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShortPixelClient({ token: ctx.auth.token });

    let status = await client.getApiStatus();

    let output = {
      monthlyCallsMade: readNumber(status.APICallsMade, 'APICallsMade'),
      monthlyCallsQuota: readNumber(status.APICallsQuota, 'APICallsQuota'),
      oneTimeCallsMade: readNumber(status.APICallsMadeOneTime, 'APICallsMadeOneTime'),
      oneTimeCallsQuota: readNumber(status.APICallsQuotaOneTime, 'APICallsQuotaOneTime'),
      totalCallsMade: readOptionalNumber(status.APICallsMadeNumeric, 'APICallsMadeNumeric'),
      totalCallsQuota: readOptionalNumber(status.APICallsQuotaNumeric, 'APICallsQuotaNumeric')
    };

    let remainingMonthly = output.monthlyCallsQuota - output.monthlyCallsMade;
    let remainingOneTime = output.oneTimeCallsQuota - output.oneTimeCallsMade;

    return {
      output,
      message: `**Monthly credits:** ${output.monthlyCallsMade}/${output.monthlyCallsQuota} used (${remainingMonthly} remaining)\n**One-time credits:** ${output.oneTimeCallsMade}/${output.oneTimeCallsQuota} used (${remainingOneTime} remaining)`
    };
  })
  .build();
