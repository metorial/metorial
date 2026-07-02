import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve contacts from your Evenium contact database. Supports filtering by name, email, company, and modification date. Use this to browse your contact list or search for specific contacts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      firstName: z.string().optional().describe('Filter by first name'),
      lastName: z.string().optional().describe('Filter by last name'),
      email: z.string().optional().describe('Filter by email address'),
      company: z.string().optional().describe('Filter by company name'),
      since: z
        .string()
        .optional()
        .describe('Only return contacts modified since this date (RFC 3339 format)'),
      firstResult: z.number().optional().describe('Offset for pagination (0-based)'),
      maxResults: z.number().optional().describe('Maximum number of results to return')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.string().describe('Unique contact identifier'),
          customId: z.string().optional().describe('External/custom contact ID'),
          firstName: z.string().optional().describe('First name'),
          lastName: z.string().optional().describe('Last name'),
          email: z.string().optional().describe('Email address'),
          company: z.string().optional().describe('Company name'),
          gender: z.string().optional().describe('Gender')
        })
      ),
      totalCount: z.string().describe('Total number of matching contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listContacts({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      company: ctx.input.company,
      since: ctx.input.since,
      firstResult: ctx.input.firstResult,
      maxResults: ctx.input.maxResults
    });

    let contacts = result.contacts.map(c => ({
      contactId: c.id,
      customId: c.customId,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      company: c.company,
      gender: c.gender
    }));

    return {
      output: {
        contacts,
        totalCount: result.totalCount
      },
      message: `Found **${contacts.length}** contact(s).`
    };
  })
  .build();
