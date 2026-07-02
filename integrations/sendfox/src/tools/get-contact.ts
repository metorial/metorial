import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a contact by ID or email address. Returns contact details including subscription status, activity timestamps, custom fields, and list memberships.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.number().optional().describe('ID of the contact to retrieve'),
      email: z.string().optional().describe('Email address of the contact to retrieve')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the contact'),
      email: z.string().describe('Email address'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      unsubscribedAt: z
        .string()
        .nullable()
        .describe('Unsubscribe timestamp, null if still subscribed'),
      bouncedAt: z.string().nullable().describe('Bounce timestamp, null if not bounced'),
      confirmedAt: z.string().nullable().describe('Confirmation timestamp'),
      lastOpenedAt: z.string().nullable().describe('Last email open timestamp'),
      lastClickedAt: z.string().nullable().describe('Last link click timestamp'),
      createdAt: z.string().describe('Creation timestamp'),
      contactFields: z
        .array(
          z.object({
            name: z.string(),
            value: z.string()
          })
        )
        .describe('Custom contact fields'),
      lists: z
        .array(
          z.object({
            listId: z.number(),
            name: z.string()
          })
        )
        .optional()
        .describe('Lists the contact belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (!ctx.input.contactId && !ctx.input.email) {
      throw new Error('Either contactId or email must be provided.');
    }

    let contact: any;
    if (ctx.input.contactId) {
      contact = await client.getContact(ctx.input.contactId);
    } else {
      contact = await client.getContactByEmail(ctx.input.email!);
      if (!contact) {
        throw new Error(`Contact with email "${ctx.input.email}" not found.`);
      }
    }

    return {
      output: {
        contactId: contact.id,
        email: contact.email,
        firstName: contact.first_name,
        lastName: contact.last_name,
        unsubscribedAt: contact.unsubscribed_at,
        bouncedAt: contact.bounced_at,
        confirmedAt: contact.confirmed_at,
        lastOpenedAt: contact.last_opened_at,
        lastClickedAt: contact.last_clicked_at,
        createdAt: contact.created_at,
        contactFields: contact.contact_fields || [],
        lists: contact.lists?.map((l: any) => ({ listId: l.id, name: l.name }))
      },
      message: `Retrieved contact **${contact.email}** (ID: ${contact.id}).`
    };
  })
  .build();
