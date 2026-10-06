import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description:
    'Identify the authenticated Affinity user, account and API grant without changing records.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number(),
      firstName: z.string(),
      lastName: z.string(),
      email: z.string(),
      tenantId: z.number(),
      tenantName: z.string(),
      subdomain: z.string(),
      grantType: z.string(),
      grantScope: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const identity = await new AffinityClient(ctx.auth.token).whoAmI();
    return {
      output: {
        userId: identity.user.id,
        firstName: identity.user.firstName,
        lastName: identity.user.lastName,
        email: identity.user.email,
        tenantId: identity.tenant.id,
        tenantName: identity.tenant.name,
        subdomain: identity.tenant.subdomain,
        grantType: identity.grant.type,
        grantScope: identity.grant.scope
      },
      message: `Identified the authenticated user in ${identity.tenant.name}.`
    };
  })
  .build();
