import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact (subscriber) in SendFox. Optionally assign the contact to one or more lists and set custom contact fields.`,
  constraints: [
    'Email address must be unique. If a contact with the given email already exists, it will be updated.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the contact'),
      firstName: z.string().optional().describe('First name of the contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      listIds: z.array(z.number()).optional().describe('List IDs to add the contact to'),
      contactFields: z
        .array(
          z.object({
            name: z.string().describe('Custom field name'),
            value: z.string().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom contact fields to set')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the created contact'),
      email: z.string().describe('Email address'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let contact = await client.createContact({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      lists: ctx.input.listIds,
      contactFields: ctx.input.contactFields
    });

    return {
      output: {
        contactId: contact.id,
        email: contact.email,
        firstName: contact.first_name,
        lastName: contact.last_name,
        createdAt: contact.created_at
      },
      message: `Contact **${contact.email}** created successfully (ID: ${contact.id}).`
    };
  })
  .build();
