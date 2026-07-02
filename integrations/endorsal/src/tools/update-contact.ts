import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's information in your Endorsal CRM. Provide the contact ID and the fields you want to change.`
})
  .input(
    z.object({
      contactId: z.string().describe('The ID of the contact to update'),
      name: z.string().optional().describe('Updated full name'),
      email: z.string().optional().describe('Updated email address'),
      phone: z.string().optional().describe('Updated phone number'),
      company: z.string().optional().describe('Updated company name'),
      position: z.string().optional().describe('Updated job title or role'),
      location: z.string().optional().describe('Updated location'),
      website: z.string().optional().describe('Updated website URL'),
      avatar: z.string().optional().describe('Updated avatar image URL'),
      customAttributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated custom attributes')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the updated contact'),
      email: z.string().optional().describe('Contact email address'),
      name: z.string().optional().describe('Contact full name'),
      company: z.string().optional().describe('Contact company name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let { contactId, ...updateData } = ctx.input;

    let contact = await client.updateContact(contactId, {
      name: updateData.name,
      email: updateData.email,
      phone: updateData.phone,
      company: updateData.company,
      position: updateData.position,
      location: updateData.location,
      website: updateData.website,
      avatar: updateData.avatar,
      customAttributes: updateData.customAttributes
    });

    return {
      output: {
        contactId: contact._id,
        email: contact.email,
        name: contact.name,
        company: contact.company
      },
      message: `Updated contact **${contact.name || contact.email || contact._id}**.`
    };
  })
  .build();
