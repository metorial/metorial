import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let unsubscribeContact = SlateTool.create(spec, {
  name: 'Unsubscribe Contact',
  key: 'unsubscribe_contact',
  description: `Unsubscribe a contact by their email address. This removes them from all lists and marks them as unsubscribed.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the contact to unsubscribe')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the unsubscribed contact'),
      email: z.string().describe('Email address'),
      unsubscribedAt: z.string().nullable().describe('Unsubscribe timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let contact = await client.unsubscribeContact(ctx.input.email);

    return {
      output: {
        contactId: contact.id,
        email: contact.email,
        unsubscribedAt: contact.unsubscribed_at
      },
      message: `Contact **${contact.email}** has been unsubscribed from all lists.`
    };
  })
  .build();
