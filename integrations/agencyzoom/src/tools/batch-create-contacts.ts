import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let batchCreateContacts = SlateTool.create(spec, {
  name: 'Batch Create Contacts',
  key: 'batch_create_contacts',
  description: `Create up to 5 contacts associated with customers in AgencyZoom. Each contact requires a customer ID, first name, and last name. Optionally include email, phone, birthday, and address fields.`,
  constraints: ['Maximum of 5 contacts per request'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contacts: z
        .array(
          z.object({
            customerId: z
              .string()
              .describe('ID of the customer to associate the contact with'),
            firstName: z.string().describe('First name of the contact'),
            lastName: z.string().describe('Last name of the contact'),
            email: z.string().optional().describe('Email address of the contact'),
            phone: z.string().optional().describe('Phone number of the contact'),
            birthday: z
              .string()
              .optional()
              .describe('Birthday of the contact (ISO 8601 date format, e.g. "1990-01-15")'),
            address: z
              .object({
                street: z.string().optional().describe('Street address'),
                city: z.string().optional().describe('City'),
                state: z.string().optional().describe('State or province'),
                zip: z.string().optional().describe('ZIP or postal code')
              })
              .optional()
              .describe('Mailing address of the contact')
          })
        )
        .min(1)
        .max(5)
        .describe('Array of contacts to create (1 to 5 contacts)')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of created contact records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let contactsData = ctx.input.contacts.map(c => {
      let contact: Record<string, any> = {
        customerId: c.customerId,
        firstName: c.firstName,
        lastName: c.lastName
      };
      if (c.email) contact.email = c.email;
      if (c.phone) contact.phone = c.phone;
      if (c.birthday) contact.birthday = c.birthday;
      if (c.address) contact.address = c.address;
      return contact;
    });

    let result = await client.batchCreateContacts(contactsData);

    let contacts = Array.isArray(result)
      ? result
      : (result?.data ?? result?.contacts ?? [result]);

    return {
      output: {
        contacts
      },
      message: `Successfully created **${contacts.length}** contact(s).`
    };
  })
  .build();
