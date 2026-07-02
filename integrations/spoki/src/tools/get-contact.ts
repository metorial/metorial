import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieves the details of a specific contact by their ID, including their phone number, name, email, tags, lists, and custom fields.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to retrieve')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('Contact ID'),
      phone: z.string().optional().describe('Phone number'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      language: z.string().optional().describe('Language code'),
      tags: z.array(z.string()).optional().describe('Tags assigned to the contact'),
      lists: z.array(z.any()).optional().describe('Lists the contact belongs to'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values'),
      raw: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info(`Fetching contact ${ctx.input.contactId}`);
    let result = await client.getContact(ctx.input.contactId);

    return {
      output: {
        contactId: result?.id ? String(result.id) : ctx.input.contactId,
        phone: result?.phone,
        firstName: result?.first_name,
        lastName: result?.last_name,
        email: result?.email,
        language: result?.language,
        tags: result?.tags,
        lists: result?.lists,
        customFields: result?.custom_fields,
        raw: result
      },
      message: `Retrieved contact **${result?.first_name || ''} ${result?.last_name || ''}** (${result?.phone || ctx.input.contactId})`
    };
  })
  .build();
