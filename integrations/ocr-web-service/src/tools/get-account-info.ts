import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieves current OCR Web Service account details including available page balance, subscription plan, and license expiration date.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      availablePages: z.number().describe('Number of pages remaining in the account balance'),
      maxPages: z.number().describe('Maximum pages allowed for the subscription plan'),
      subscriptionPlan: z.string().describe('Current subscription plan name'),
      expirationDate: z.string().describe('License expiration date'),
      lastProcessingTime: z.string().describe('Timestamp of the last OCR processing request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      licenseCode: ctx.auth.licenseCode
    });

    ctx.progress('Fetching account information...');

    let result = await client.getAccountInfo();

    return {
      output: {
        availablePages: result.AvailablePages,
        maxPages: result.MaxPages,
        subscriptionPlan: result.SubcriptionPlan,
        expirationDate: result.ExpirationDate,
        lastProcessingTime: result.LastProcessingTime
      },
      message: `Account: **${result.SubcriptionPlan}** plan. **${result.AvailablePages}** / ${result.MaxPages} pages remaining. Expires: ${result.ExpirationDate}.`
    };
  })
  .build();
