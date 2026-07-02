import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContactTool = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's details in your Heyy business account. You can modify names, labels, and custom attributes. Note that email and phone number cannot be changed after creation.`,
  constraints: [
    'Email and phone number cannot be updated after contact creation.',
    'Custom attribute externalId must start with a letter and contain only alphanumeric characters and underscores.'
  ]
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to update'),
      firstName: z.string().nullable().optional().describe('Updated first name'),
      lastName: z.string().nullable().optional().describe('Updated last name'),
      labels: z
        .array(
          z.object({
            name: z.string().describe('Label name')
          })
        )
        .optional()
        .describe('Updated labels for the contact'),
      attributes: z
        .array(
          z.object({
            externalId: z.string().describe('Attribute identifier'),
            value: z.string().describe('Attribute value')
          })
        )
        .optional()
        .describe('Updated custom attributes')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Unique identifier of the contact'),
      firstName: z.string().nullable().optional().describe('First name'),
      lastName: z.string().nullable().optional().describe('Last name'),
      phoneNumber: z.string().nullable().optional().describe('Phone number'),
      email: z.string().nullable().optional().describe('Email address'),
      labels: z.array(z.string()).optional().describe('Assigned labels'),
      attributes: z
        .array(
          z.object({
            name: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Custom attributes'),
      updatedAt: z.string().optional().describe('When the contact was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updateData: Record<string, any> = {};
    if (ctx.input.firstName !== undefined) updateData.firstName = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) updateData.lastName = ctx.input.lastName;
    if (ctx.input.labels !== undefined) updateData.labels = ctx.input.labels;
    if (ctx.input.attributes !== undefined) updateData.attributes = ctx.input.attributes;

    let contact = await client.updateContact(ctx.input.contactId, updateData);

    let name = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unnamed';

    return {
      output: {
        contactId: contact.id,
        firstName: contact.firstName ?? null,
        lastName: contact.lastName ?? null,
        phoneNumber: contact.phoneNumber ?? null,
        email: contact.email ?? null,
        labels: contact.labels,
        attributes: contact.attributes,
        updatedAt: contact.updatedAt
      },
      message: `Updated contact **${name}** (${contact.id}).`
    };
  })
  .build();
