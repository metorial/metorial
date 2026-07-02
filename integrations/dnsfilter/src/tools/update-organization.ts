import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateOrganization = SlateTool.create(spec, {
  name: 'Update Organization',
  key: 'update_organization',
  description: `Updates an existing organization's settings. Can modify the organization name and other configuration attributes.`
})
  .input(
    z.object({
      organizationId: z.string().describe('ID of the organization to update'),
      name: z.string().optional().describe('New name for the organization'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional attributes to update')
    })
  )
  .output(
    z.object({
      organization: z.record(z.string(), z.any()).describe('Updated organization details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let params: Record<string, any> = {};
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.attributes) Object.assign(params, ctx.input.attributes);

    let organization = await client.updateOrganization(ctx.input.organizationId, params);

    return {
      output: { organization },
      message: `Updated organization **${organization.name ?? ctx.input.organizationId}**.`
    };
  })
  .build();
