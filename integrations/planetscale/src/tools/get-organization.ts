import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Retrieve details about the configured PlanetScale organization, including plan, billing status, database count, and feature flags.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organizationId: z.string(),
      name: z.string(),
      plan: z.string().optional(),
      billingEmail: z.string().optional(),
      databaseCount: z.number().optional(),
      validBillingInfo: z.boolean().optional(),
      sso: z.boolean().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    let org = await client.getOrganization();

    return {
      output: {
        organizationId: org.id,
        name: org.name,
        plan: org.plan,
        billingEmail: org.billing_email,
        databaseCount: org.database_count,
        validBillingInfo: org.valid_billing_info,
        sso: org.sso,
        createdAt: org.created_at,
        updatedAt: org.updated_at
      },
      message: `Organization **${org.name}** is on the **${org.plan || 'unknown'}** plan with **${org.database_count || 0}** database(s).`
    };
  });
