import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve detailed information about a contact by email address. Returns the contact's subscription status, list memberships, field values, and other metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the contact to look up')
    })
  )
  .output(
    z.object({
      contact: z.any().describe('Full contact information including fields, lists, and status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    let result = await client.getContact(ctx.input.email);

    return {
      output: { contact: result },
      message: `Retrieved contact information for **${ctx.input.email}**`
    };
  })
  .build();
