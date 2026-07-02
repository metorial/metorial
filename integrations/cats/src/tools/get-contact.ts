import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a single contact record by ID with full details including company association.`,
  tags: {
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
      contactId: z.string().describe('Contact ID'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      title: z.string().optional().describe('Job title'),
      notes: z.string().optional().describe('Notes'),
      isHot: z.boolean().optional().describe('Whether hot'),
      countryCode: z.string().optional().describe('Country code'),
      createdAt: z.string().optional().describe('Created date'),
      updatedAt: z.string().optional().describe('Updated date'),
      emails: z.array(z.any()).optional().describe('Email addresses'),
      phones: z.array(z.any()).optional().describe('Phone numbers'),
      address: z.any().optional().describe('Address'),
      links: z.any().optional().describe('HAL links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getContact(ctx.input.contactId);

    return {
      output: {
        contactId: (data.id ?? ctx.input.contactId).toString(),
        firstName: data.first_name,
        lastName: data.last_name,
        title: data.title,
        notes: data.notes,
        isHot: data.is_hot,
        countryCode: data.country_code,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        emails: data._embedded?.emails,
        phones: data._embedded?.phones,
        address: data._embedded?.address ?? data.address,
        links: data._links
      },
      message: `Retrieved contact **${data.first_name ?? ''} ${data.last_name ?? ''}** (ID: ${ctx.input.contactId}).`
    };
  })
  .build();
