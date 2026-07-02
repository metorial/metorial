import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteGroup = SlateTool.create(spec, {
  name: 'Delete Group',
  key: 'delete_group',
  description: `Permanently delete a database group and all its databases. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      groupName: z.string().describe('Name of the group to delete')
    })
  )
  .output(
    z.object({
      deletedGroup: z.string().describe('Name of the deleted group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    await client.deleteGroup(ctx.input.groupName);

    return {
      output: {
        deletedGroup: ctx.input.groupName
      },
      message: `Deleted group **${ctx.input.groupName}** and all its databases.`
    };
  })
  .build();
