import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getOrganizationTool = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Get details about the configured Terraform Cloud organization, including plan entitlements, feature flags, and usage limits.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organizationId: z.string(),
      name: z.string(),
      email: z.string(),
      collaboratorAuthPolicy: z.string(),
      planExpired: z.boolean(),
      planExpiresAt: z.string(),
      costEstimationEnabled: z.boolean(),
      createdAt: z.string(),
      trialing: z.boolean(),
      permissions: z.object({
        canCreateTeam: z.boolean(),
        canCreateWorkspace: z.boolean(),
        canManageUsers: z.boolean(),
        canUpdate: z.boolean(),
        canDestroy: z.boolean()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.getOrganization();
    let org = response.data;

    return {
      output: {
        organizationId: org.id || '',
        name: org.attributes?.name || '',
        email: org.attributes?.email || '',
        collaboratorAuthPolicy: org.attributes?.['collaborator-auth-policy'] || '',
        planExpired: org.attributes?.['plan-expired'] ?? false,
        planExpiresAt: org.attributes?.['plan-expires-at'] || '',
        costEstimationEnabled: org.attributes?.['cost-estimation-enabled'] ?? false,
        createdAt: org.attributes?.['created-at'] || '',
        trialing: org.attributes?.trialing ?? false,
        permissions: {
          canCreateTeam: org.attributes?.permissions?.['can-create-team'] ?? false,
          canCreateWorkspace: org.attributes?.permissions?.['can-create-workspace'] ?? false,
          canManageUsers: org.attributes?.permissions?.['can-manage-users'] ?? false,
          canUpdate: org.attributes?.permissions?.['can-update'] ?? false,
          canDestroy: org.attributes?.permissions?.['can-destroy'] ?? false
        }
      },
      message: `Organization **${org.attributes?.name}** (${org.id}).`
    };
  })
  .build();
