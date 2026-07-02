import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { spec } from '../spec';

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Retrieve details about the BugHerd organization/account associated with the API key. Returns the organization name and ID.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organizationId: z.number().describe('Organization ID'),
      name: z.string().describe('Organization name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);
    let org = await client.getOrganization();

    return {
      output: {
        organizationId: org.id,
        name: org.name
      },
      message: `Retrieved organization: **${org.name}** (ID: ${org.id})`
    };
  })
  .build();
