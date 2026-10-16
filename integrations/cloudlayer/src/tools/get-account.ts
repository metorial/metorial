import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { numberValue, rawResponse, requiredText, textValue } from '../lib/responses';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description:
    'Identify the account connected to the API key and inspect its subscription, API usage, storage, and credit balance.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string().describe('Provider account user ID'),
      email: z.string().optional().describe('Account email address'),
      subscription: z.string().optional().describe('Subscription price ID'),
      billingModel: z.string().optional().describe('Billing model, such as limit or usage'),
      subscriptionActive: z
        .boolean()
        .optional()
        .describe('Whether the subscription is active'),
      calls: z.number().optional().describe('API calls in the billing period'),
      callsLimit: z.number().optional().describe('API call limit; -1 means unlimited'),
      creditsRemaining: z
        .number()
        .optional()
        .describe('Credit balance when the billing model supplies it'),
      storageUsed: z.number().optional().describe('Stored bytes'),
      storageLimit: z.number().optional().describe('Storage limit in bytes'),
      raw: z
        .record(z.string(), z.unknown())
        .describe('Provider account details with credentials removed')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getAccount();
    let output = {
      accountId: requiredText('account user ID', result.uid),
      raw: rawResponse(result),
      ...pickDefined({
        email: textValue(result.email),
        subscription: textValue(result.subscription),
        billingModel: textValue(result.subType),
        subscriptionActive:
          typeof result.subActive === 'boolean' ? result.subActive : undefined,
        calls: numberValue(result.calls),
        callsLimit: numberValue(result.callsLimit),
        creditsRemaining: numberValue(result.credit),
        storageUsed: numberValue(result.storageUsed),
        storageLimit: numberValue(result.storageLimit)
      })
    };
    return { output, message: `Connected Cloudlayer account **${output.accountId}**.` };
  })
  .build();
