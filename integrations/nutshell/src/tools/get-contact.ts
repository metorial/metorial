import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a contact (person) by ID from Nutshell CRM. Returns full contact details including emails, phones, associated accounts, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to retrieve')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the contact'),
      rev: z.string().describe('Revision identifier'),
      name: z.string().describe('Full name of the contact'),
      emails: z.array(z.any()).optional().describe('Email addresses'),
      phones: z.array(z.any()).optional().describe('Phone numbers'),
      title: z.string().optional().describe('Job title'),
      description: z.string().optional().describe('Description'),
      accounts: z.array(z.any()).optional().describe('Associated accounts'),
      leads: z.array(z.any()).optional().describe('Associated leads'),
      address: z.any().optional().describe('Mailing address'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values'),
      createdTime: z.string().optional().describe('Creation timestamp'),
      modifiedTime: z.string().optional().describe('Last modified timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.getContact(ctx.input.contactId);

    return {
      output: {
        contactId: result.id,
        rev: String(result.rev),
        name: result.name,
        emails: result.email || result.emails,
        phones: result.phone || result.phones,
        title: result.title,
        description: result.description,
        accounts: result.accounts,
        leads: result.leads,
        address: result.address,
        customFields: result.customFields,
        createdTime: result.createdTime,
        modifiedTime: result.modifiedTime
      },
      message: `Retrieved contact **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
