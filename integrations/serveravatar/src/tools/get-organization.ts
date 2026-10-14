import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { organizationIdSchema, organizationScopeGuidance } from '../lib/schemas';
import { spec } from '../spec';

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Retrieve an organization by ID, including its name, owner ID, and account access details.
${organizationScopeGuidance}`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      organizationId: organizationIdSchema
    })
  )
  .output(
    z.object({
      organization: z.record(z.string(), z.unknown()).describe('Organization details')
    })
  )
  .handleInvocation(async ctx => {
    let organizationId = ctx.input.organizationId || ctx.config.organizationId;
    if (!organizationId) {
      throw createApiServiceError('organizationId is required either in input or config');
    }
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let organization = await client.getOrganization(organizationId);
    return {
      output: { organization },
      message: `Retrieved organization **${organizationId}**.`
    };
  })
  .build();
