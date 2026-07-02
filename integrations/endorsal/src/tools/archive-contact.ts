import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let archiveContact = SlateTool.create(spec, {
  name: 'Archive Contact',
  key: 'archive_contact',
  description: `Archive a contact in your Endorsal CRM. Archived contacts will no longer receive AutoRequest campaigns.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('The ID of the contact to archive')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the archived contact'),
      name: z.string().optional().describe('Contact name'),
      email: z.string().optional().describe('Contact email')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let contact = await client.archiveContact(ctx.input.contactId);

    return {
      output: {
        contactId: contact._id,
        name: contact.name,
        email: contact.email
      },
      message: `Archived contact **${contact.name || contact.email || contact._id}**.`
    };
  })
  .build();
