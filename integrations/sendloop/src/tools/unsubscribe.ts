import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendloopClient } from '../lib/client';
import { spec } from '../spec';

export let unsubscribe = SlateTool.create(spec, {
  name: 'Unsubscribe',
  key: 'unsubscribe',
  description: `Remove a subscriber from a specified list by email address. The subscriber will no longer receive emails from this list.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the subscriber list to unsubscribe from'),
      emailAddress: z.string().describe('Email address of the subscriber to remove'),
      unsubscriptionIp: z
        .string()
        .optional()
        .describe('IP address for the unsubscription request (defaults to 127.0.0.1)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the unsubscription was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendloopClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    await client.unsubscribe({
      listId: ctx.input.listId,
      emailAddress: ctx.input.emailAddress,
      unsubscriptionIp: ctx.input.unsubscriptionIp
    });

    return {
      output: { success: true },
      message: `Successfully unsubscribed **${ctx.input.emailAddress}** from list **${ctx.input.listId}**.`
    };
  })
  .build();
