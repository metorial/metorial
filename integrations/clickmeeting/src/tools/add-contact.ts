import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addContact = SlateTool.create(spec, {
  name: 'Add Contact',
  key: 'add_contact',
  description: `Adds a contact to the ClickMeeting address book. Contacts can be used in invitations and event management.`
})
  .input(
    z.object({
      email: z.string().describe('Email address of the contact'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phone: z.string().optional().describe('Phone number'),
      company: z.string().optional().describe('Company name')
    })
  )
  .output(
    z.object({
      contact: z.record(z.string(), z.unknown()).describe('Created or updated contact details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.addContact({
      email: ctx.input.email,
      firstname: ctx.input.firstName,
      lastname: ctx.input.lastName,
      phone: ctx.input.phone,
      company: ctx.input.company
    });

    return {
      output: { contact: result },
      message: `Added contact **${ctx.input.email}** to the address book.`
    };
  })
  .build();
