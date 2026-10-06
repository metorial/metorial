import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext } from '../lib/client';
import { spec } from '../spec';

export let transferGroup = SlateTool.create(spec, {
  name: 'Transfer Group',
  key: 'transfer_group',
  description: `Choose an organization with list_organizations. Transfer a database group to another organization. Moves the group and all its databases to the target organization.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      organizationSlug: z
        .string()
        .optional()
        .describe(
          'Organization slug. Call list_organizations to discover authorized organizations; older connections may use their saved organization.'
        ),
      groupName: z.string().describe('Name of the group to transfer'),
      targetOrganization: z.string().describe('Slug of the target organization')
    })
  )
  .output(
    z.object({
      groupName: z.string().describe('Name of the transferred group'),
      targetOrganization: z.string().describe('Slug of the target organization')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

    await client.transferGroup(ctx.input.groupName, ctx.input.targetOrganization);

    return {
      output: {
        groupName: ctx.input.groupName,
        targetOrganization: ctx.input.targetOrganization
      },
      message: `Transferred group **${ctx.input.groupName}** to organization **${ctx.input.targetOrganization}**.`
    };
  })
  .build();
