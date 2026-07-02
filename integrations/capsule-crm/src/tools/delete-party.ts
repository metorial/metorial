import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let deleteParty = SlateTool.create(spec, {
  name: 'Delete Party',
  key: 'delete_party',
  description: `Permanently delete a contact (person or organisation) from Capsule CRM.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      partyId: z.number().describe('ID of the party to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    await client.deleteParty(ctx.input.partyId);

    return {
      output: { success: true },
      message: `Deleted party **#${ctx.input.partyId}**.`
    };
  })
  .build();
