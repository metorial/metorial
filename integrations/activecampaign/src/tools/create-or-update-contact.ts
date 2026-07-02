import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrUpdateContact = SlateTool.create(spec, {
  name: 'Create or Update Contact',
  key: 'create_or_update_contact',
  description: `Creates a new contact or updates an existing one using ActiveCampaign's sync endpoint. If a contact with the given email already exists, it will be updated with the provided fields. Otherwise, a new contact is created. Supports setting custom field values.`,
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
      phone: z.string().optional().describe('Phone number of the contact'),
      fieldValues: z
        .array(
          z.object({
            fieldId: z.string().describe('ID of the custom field'),
            value: z.string().describe('Value for the custom field')
          })
        )
        .optional()
        .describe('Custom field values to set on the contact')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the created or updated contact'),
      email: z.string().describe('Email address of the contact'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phone: z.string().optional().describe('Phone number'),
      createdAt: z.string().optional().describe('Date the contact was created'),
      updatedAt: z.string().optional().describe('Date the contact was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let contactPayload: Record<string, any> = {
      email: ctx.input.email
    };
    if (ctx.input.firstName) contactPayload.firstName = ctx.input.firstName;
    if (ctx.input.lastName) contactPayload.lastName = ctx.input.lastName;
    if (ctx.input.phone) contactPayload.phone = ctx.input.phone;
    if (ctx.input.fieldValues) {
      contactPayload.fieldValues = ctx.input.fieldValues.map(fv => ({
        field: fv.fieldId,
        value: fv.value
      }));
    }

    let result = await client.syncContact(contactPayload);
    let contact = result.contact;

    return {
      output: {
        contactId: contact.id,
        email: contact.email,
        firstName: contact.firstName || undefined,
        lastName: contact.lastName || undefined,
        phone: contact.phone || undefined,
        createdAt: contact.cdate || undefined,
        updatedAt: contact.udate || undefined
      },
      message: `Contact **${contact.email}** (ID: ${contact.id}) has been created or updated.`
    };
  })
  .build();
