import { SlateTool } from 'slates';
import { z } from 'zod';
import { AnthropicClient } from '../lib/client';
import { spec } from '../spec';

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Retrieve information about the organization associated with the current Admin API key. Useful for determining which organization a key belongs to and getting organization details.
Requires an Admin API key (sk-ant-admin...).`,
  constraints: ['Requires an Admin API key (sk-ant-admin...).'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organization: z.record(z.string(), z.unknown()).describe('Organization details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AnthropicClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let organization = await client.getOrganization();

    return {
      output: { organization },
      message: `Retrieved organization info: **${(organization as Record<string, unknown>).name || organization.id || 'unknown'}**.`
    };
  })
  .build();
