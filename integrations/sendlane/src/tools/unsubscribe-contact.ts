import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendlaneClient } from '../lib/client';
import { spec } from '../spec';

export let unsubscribeContact = SlateTool.create(spec, {
  name: 'Unsubscribe Contact',
  key: 'unsubscribe_contact',
  description: `Unsubscribe a contact from all email communications. The contact will remain in your account but will no longer receive marketing emails.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to unsubscribe')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendlaneClient(ctx.auth.token);
    await client.unsubscribeContact(ctx.input.contactId);

    return {
      output: { success: true },
      message: `Contact ${ctx.input.contactId} has been unsubscribed.`
    };
  })
  .build();
