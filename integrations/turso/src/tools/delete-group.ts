import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext } from '../lib/client';
import { spec } from '../spec';

export let deleteGroup = SlateTool.create(spec, {
  name: 'Delete Group',
  key: 'delete_group',
  description: `Choose an organization with list_organizations. Delete a database group and all its databases. Recovery is available only to eligible organizations within Turso retention limits; do not rely on recovery.`,
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
      groupName: z.string().describe('Name of the group to delete')
    })
  )
  .output(
    z.object({
      deletedGroup: z.string().describe('Name of the deleted group')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

    await client.deleteGroup(ctx.input.groupName);

    return {
      output: {
        deletedGroup: ctx.input.groupName
      },
      message: `Deleted group **${ctx.input.groupName}** and all its databases.`
    };
  })
  .build();
