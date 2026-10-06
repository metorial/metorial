import { SlateTool } from 'slates';
import { z } from 'zod';
import { organizationNameSchema } from '../lib/contracts';
import { createClient } from '../lib/helpers';
import { mapOrganization } from '../lib/mappers';
import { spec } from '../spec';

export let getOrganizationTool = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Call list_organizations to select an organization or use the optional configured default. Get details about the configured Terraform Cloud organization, including basic plan flags, notification email and current permissions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationName: organizationNameSchema
    })
  )
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
    const output = mapOrganization(response.data);
    return { output, message: `Organization **${output.name}** (${output.organizationId}).` };
  })
  .build();
