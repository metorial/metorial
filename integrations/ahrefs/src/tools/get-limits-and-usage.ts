import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let usageSchema = z.object({
  api_key_expiration_date: z.string().describe('When the API key expires'),
  subscription: z.string().describe('Ahrefs subscription plan'),
  units_limit_api_key: z
    .number()
    .nullable()
    .describe('Monthly key limit; null means unlimited'),
  units_limit_workspace: z
    .number()
    .nullable()
    .describe('Workspace monthly API unit allowance'),
  units_usage_api_key: z.number().describe('API units used by this key this billing month'),
  units_usage_workspace: z.number().nullable().describe('API units used by the workspace'),
  usage_reset_date: z.string().describe('Date of the next billing period')
});

export let getLimitsAndUsage = SlateTool.create(spec, {
  name: 'Get Limits and Usage',
  key: 'get_limits_and_usage',
  description:
    'Retrieve the connected API key expiration date, Ahrefs subscription plan, API unit limits, current usage, and billing reset date. Use before running paid reports to inspect available quota.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ usage: usageSchema }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.getLimitsAndUsage();
    let parsed = usageSchema.safeParse(response?.limits_and_usage);
    if (!parsed.success) {
      throw createApiServiceError('Ahrefs returned an invalid limits and usage response.', {
        reason: 'ahrefs_usage_response'
      });
    }
    return {
      output: { usage: parsed.data },
      message: `Retrieved API limits and usage for the **${parsed.data.subscription}** plan.`
    };
  })
  .build();
