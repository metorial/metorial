import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let quotaSchema = z
  .object({
    usage: z.string().optional().describe('Current quota usage in the billing cycle'),
    limit: z.string().optional().describe('Quota limit for the billing cycle'),
    periodStart: z.string().optional().describe('Start of the current billing cycle'),
    periodEnd: z.string().optional().describe('End of the current billing cycle')
  })
  .optional();

export let getOrganizationQuotas = SlateTool.create(spec, {
  name: 'Get Organization Quotas',
  key: 'get_organization_quotas',
  description:
    'Retrieve FullStory organization quota usage for the current billing cycle, including session quota and server event quota.',
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      sessionQuota: quotaSchema.describe('Session quota usage'),
      serverEventQuota: quotaSchema.describe('Server-side event quota usage')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let quotas = await client.getOrganizationQuotas();

    return {
      output: quotas,
      message: 'Retrieved FullStory organization quotas.'
    };
  })
  .build();
