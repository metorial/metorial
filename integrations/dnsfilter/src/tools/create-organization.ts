import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrganization = SlateTool.create(spec, {
  name: 'Create Organization',
  key: 'create_organization',
  description: `Creates a new organization (tenant). Useful for MSPs onboarding new customers. The new organization can then have policies, networks, and users assigned to it.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the new organization'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional organization attributes')
    })
  )
  .output(
    z.object({
      organization: z.record(z.string(), z.any()).describe('Created organization details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let params: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.attributes) {
      params = { ...params, ...ctx.input.attributes };
    }
    let organization = await client.createOrganization(params);

    return {
      output: { organization },
      message: `Created organization **${organization.name ?? ctx.input.name}**.`
    };
  })
  .build();
