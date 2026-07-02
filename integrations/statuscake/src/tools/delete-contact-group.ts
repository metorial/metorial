import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteContactGroup = SlateTool.create(spec, {
  name: 'Delete Contact Group',
  key: 'delete_contact_group',
  description: `Permanently delete a contact group. This action cannot be undone. Monitors using this group will no longer send alerts to its members.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the contact group to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteContactGroup(ctx.input.groupId);

    return {
      output: { success: true },
      message: `Deleted contact group **${ctx.input.groupId}**.`
    };
  })
  .build();
