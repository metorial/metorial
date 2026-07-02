import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a contact by identifier (ID, phone, or email). Returns the full contact profile including tags, assignee, custom fields, and channel information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      identifierType: z
        .enum(['id', 'phone', 'email'])
        .describe('Type of identifier to look up the contact'),
      identifierValue: z
        .string()
        .describe('Value of the identifier (contact ID, phone number, or email)')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      language: z.string().optional().describe('Language code'),
      countryCode: z.string().optional().describe('ISO country code'),
      profilePictureUrl: z.string().optional().describe('URL of profile picture'),
      tags: z.array(z.string()).optional().describe('Tags assigned to this contact'),
      assignee: z.any().optional().describe('Currently assigned user'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values'),
      status: z.string().optional().describe('Contact status'),
      createdAt: z.string().optional().describe('Contact creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getContact(ctx.input.identifierType, ctx.input.identifierValue);
    let contact = result?.data || result;

    return {
      output: {
        contactId: String(contact.id || ''),
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        language: contact.language,
        countryCode: contact.countryCode,
        profilePictureUrl: contact.profilePictureUrl,
        tags: contact.tags,
        assignee: contact.assignee,
        customFields: contact.custom_fields || contact.customFields,
        status: contact.status,
        createdAt: contact.createdAt
      },
      message: `Retrieved contact **${contact.firstName || ''} ${contact.lastName || ''}** (ID: ${contact.id}).`
    };
  })
  .build();
