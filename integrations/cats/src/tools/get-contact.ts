import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requiredId } from '../lib/response';
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
      raw: z.any().optional().describe('Complete provider response, retaining null values'),
      links: z.any().optional().describe('HAL links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getContact(ctx.input.contactId);

    return {
      output: {
        contactId: requiredId(data?.id, 'record'),
        firstName: data.first_name ?? undefined,
        lastName: data.last_name ?? undefined,
        title: data.title ?? undefined,
        notes: data.notes ?? undefined,
        isHot: data.is_hot ?? undefined,
        countryCode: data.country_code ?? undefined,
        createdAt: data.date_created ?? undefined,
        updatedAt: data.date_modified ?? undefined,
        emails:
          data._embedded?.emails ??
          (data.emails && typeof data.emails === 'object'
            ? Object.entries(data.emails)
                .filter(([, value]) => typeof value === 'string')
                .map(([kind, email]) => ({ email, is_primary: kind === 'primary' }))
            : undefined),
        phones: data._embedded?.phones ?? undefined,
        address: data._embedded?.address ?? data.address,
        raw: data,
        links: data._links
      },
      message: `Retrieved contact **${data.first_name ?? ''} ${data.last_name ?? ''}** (ID: ${ctx.input.contactId}).`
    };
  })
  .build();
