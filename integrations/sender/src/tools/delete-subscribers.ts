import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSubscribers = SlateTool.create(spec, {
  name: 'Delete Subscribers',
  key: 'delete_subscribers',
  description: `Permanently deletes one or more subscribers from your Sender account by their email addresses. This action is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      emails: z
        .array(z.string())
        .min(1)
        .describe('Array of subscriber email addresses to delete')
    })
  )
  .output(
    z.object({
      confirmationMessage: z.string().describe('Confirmation message from Sender'),
      deleteInstanceId: z.string().describe('Reference ID for the deletion operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteSubscribers(ctx.input.emails);

    return {
      output: {
        confirmationMessage: result.message,
        deleteInstanceId: result.delete_instance
      },
      message: `Deletion initiated for **${ctx.input.emails.length}** subscriber(s). ${result.message}`
    };
  })
  .build();
