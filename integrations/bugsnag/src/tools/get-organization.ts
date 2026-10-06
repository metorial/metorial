import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { spec } from '../spec';

export const getOrganization = SlateTool.create(spec, {
  key: 'get_organization',
  name: 'Get Organization',
  description: 'Read an accessible Bugsnag organization and its billing and account metadata.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID from List Organizations')
    })
  )
  .output(
    z.object({
      organizationId: z.string().describe('Organization identifier'),
      name: z.string().describe('Organization name'),
      slug: z.string().optional().describe('Organization dashboard slug'),
      billingEmails: z.array(z.string()).optional().describe('Configured billing recipients'),
      autoUpgrade: z
        .boolean()
        .optional()
        .describe('Whether usage can automatically upgrade the plan'),
      managedByPlatformServices: z
        .boolean()
        .optional()
        .describe('Whether SmartBear Platform Services manages the organization')
    })
  )
  .handleInvocation(async ctx => {
    const organization = await new BugsnagClient(ctx.auth).getOrganization(
      ctx.input.organizationId || ctx.config.organizationId || ''
    );
    return {
      output: {
        organizationId: organization.id,
        name: organization.name,
        slug: organization.slug ?? undefined,
        billingEmails: organization.billing_emails ?? undefined,
        autoUpgrade: organization.auto_upgrade ?? undefined,
        managedByPlatformServices: organization.managed_by_platform_services ?? undefined
      },
      message: `Retrieved organization **${organization.name}**.`
    };
  })
  .build();
