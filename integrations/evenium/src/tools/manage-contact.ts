import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type EveniumContact } from '../lib/client';
import { contactSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, update, or retrieve a contact in the Evenium contact database. Use **action** "create" to add a new contact, "update" to modify an existing one (requires contactId), or "get" to retrieve a contact's details.`,
  instructions: [
    'For "create", provide contact details such as firstName, lastName, and email.',
    'For "update", provide the contactId and any fields you want to change.',
    'For "get", only the contactId is required.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get']).describe('Action to perform on the contact'),
      contactId: z
        .string()
        .optional()
        .describe('Contact ID (required for update and get actions)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      company: z.string().optional().describe('Company name'),
      gender: z.enum(['MALE', 'FEMALE']).optional().describe('Gender'),
      customId: z.string().optional().describe('External/custom ID for CRM mapping'),
      fields: z
        .array(
          z.object({
            name: z.string().describe('Custom field name'),
            value: z.string().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom fields as name-value pairs')
    })
  )
  .output(contactSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, contactId, firstName, lastName, email, company, gender, customId, fields } =
      ctx.input;

    let contact: EveniumContact;
    let actionLabel: string;

    if (action === 'get') {
      if (!contactId) throw createApiServiceError('contactId is required for get action');
      contact = await client.getContact(contactId);
      actionLabel = 'Retrieved';
    } else if (action === 'create') {
      contact = await client.createContact({
        firstName,
        lastName,
        email,
        company,
        gender,
        customId,
        fields
      });
      actionLabel = 'Created';
    } else {
      if (!contactId) throw createApiServiceError('contactId is required for update action');
      contact = await client.updateContact(contactId, {
        firstName,
        lastName,
        email,
        company,
        gender,
        customId,
        fields
      });
      actionLabel = 'Updated';
    }

    return {
      output: {
        contactId: contact.id,
        customId: contact.customId,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        company: contact.company,
        gender: contact.gender,
        raw: contact.raw
      },
      message: `${actionLabel} contact **${contact.firstName ?? ''} ${contact.lastName ?? ''}** (ID: \`${contact.id}\`).`
    };
  })
  .build();
