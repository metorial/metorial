import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Retrieve your Zoho CRM organization details including company name, time zone, currency, license info, and other settings.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organization: z.record(z.string(), z.any()).describe('Organization details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    let result = await client.getOrganization();
    let organization = result?.org?.[0] || result?.org || {};

    return {
      output: { organization },
      message: `Retrieved organization details.`
    };
  })
  .build();
