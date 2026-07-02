import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Retrieves detailed information about a specific organization by ID. Returns organization settings, subscription details, and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('ID of the organization to retrieve')
    })
  )
  .output(
    z.object({
      organization: z.record(z.string(), z.any()).describe('Organization details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let organization = await client.getOrganization(ctx.input.organizationId);

    return {
      output: { organization },
      message: `Retrieved organization **${organization.name ?? ctx.input.organizationId}**.`
    };
  })
  .build();
