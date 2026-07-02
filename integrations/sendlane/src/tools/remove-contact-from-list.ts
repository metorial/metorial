import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendlaneClient } from '../lib/client';
import { spec } from '../spec';

export let removeContactFromList = SlateTool.create(spec, {
  name: 'Remove Contact from List',
  key: 'remove_contact_from_list',
  description: `Remove a contact from a specific list. The contact will no longer be subscribed to the list but will remain in your Sendlane account.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the list to remove the contact from'),
      contactId: z.number().describe('ID of the contact to remove')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendlaneClient(ctx.auth.token);
    await client.removeContactFromList(ctx.input.listId, ctx.input.contactId);

    return {
      output: { success: true },
      message: `Removed contact ${ctx.input.contactId} from list ${ctx.input.listId}.`
    };
  })
  .build();
