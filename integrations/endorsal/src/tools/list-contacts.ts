import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve a list of contacts from your Endorsal CRM. Contacts are customer records used in review request campaigns. Use this to browse your contact database or find specific customers.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of contacts to return'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.string().describe('Unique contact ID'),
          email: z.string().optional().describe('Contact email address'),
          phone: z.string().optional().describe('Contact phone number'),
          name: z.string().optional().describe('Contact full name'),
          firstName: z.string().optional().describe('Contact first name'),
          lastName: z.string().optional().describe('Contact last name'),
          company: z.string().optional().describe('Contact company name'),
          position: z.string().optional().describe('Contact job title'),
          location: z.string().optional().describe('Contact location'),
          website: z.string().optional().describe('Contact website URL'),
          avatar: z.string().optional().describe('Contact avatar image URL'),
          archived: z.boolean().optional().describe('Whether the contact is archived'),
          added: z.number().optional().describe('Timestamp when contact was added')
        })
      ),
      total: z.number().optional().describe('Total number of contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listContacts({
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let contacts = (result.data || []).map(c => ({
      contactId: c._id,
      email: c.email,
      phone: c.phone,
      name: c.name,
      firstName: c.firstName,
      lastName: c.lastName,
      company: c.company,
      position: c.position,
      location: c.location,
      website: c.website,
      avatar: c.avatar,
      archived: c.archived,
      added: c.added
    }));

    return {
      output: {
        contacts,
        total: result.total
      },
      message: `Found **${contacts.length}** contact(s)${result.total ? ` out of ${result.total} total` : ''}.`
    };
  })
  .build();
