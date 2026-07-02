import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search for contacts in eSputnik by email, phone number, external customer ID, first name, or last name. Returns matching contacts with their channels, custom fields, and segment membership.`,
  constraints: ['Maximum 500 contacts returned per request'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by email address'),
      phone: z.string().optional().describe('Filter by phone number'),
      externalCustomerId: z.string().optional().describe('Filter by external customer ID'),
      firstName: z.string().optional().describe('Filter by first name'),
      lastName: z.string().optional().describe('Filter by last name'),
      startIndex: z.number().optional().describe('Starting index for pagination (default: 1)'),
      maxRows: z
        .number()
        .optional()
        .describe('Maximum number of contacts to return (max: 500)')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.number().describe('eSputnik internal contact ID'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            channels: z
              .array(
                z.object({
                  type: z.string().describe('Channel type'),
                  value: z.string().describe('Channel value')
                })
              )
              .optional()
              .describe('Contact channels'),
            fields: z
              .array(
                z.object({
                  id: z.number().describe('Custom field ID'),
                  value: z.string().optional().describe('Custom field value')
                })
              )
              .optional()
              .describe('Custom fields'),
            groups: z
              .array(z.string())
              .optional()
              .describe('Segment names the contact belongs to'),
            externalCustomerId: z.string().optional().describe('External customer ID'),
            languageCode: z.string().optional().describe('Language code'),
            timeZone: z.string().optional().describe('Timezone')
          })
        )
        .describe('Matching contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {};
    if (ctx.input.email) params.email = ctx.input.email;
    if (ctx.input.phone) params.sms = ctx.input.phone;
    if (ctx.input.externalCustomerId) params.externalCustomerId = ctx.input.externalCustomerId;
    if (ctx.input.firstName) params.firstname = ctx.input.firstName;
    if (ctx.input.lastName) params.lastname = ctx.input.lastName;
    if (ctx.input.startIndex) params.startindex = ctx.input.startIndex;
    if (ctx.input.maxRows) params.maxrows = ctx.input.maxRows;

    let results = await client.searchContacts(params);
    let contacts = Array.isArray(results) ? results : [];

    let mappedContacts = contacts.map((c: any) => ({
      contactId: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      channels: c.channels,
      fields: c.fields,
      groups: c.groups,
      externalCustomerId: c.externalCustomerId,
      languageCode: c.languageCode,
      timeZone: c.timeZone
    }));

    return {
      output: {
        contacts: mappedContacts
      },
      message: `Found **${mappedContacts.length}** contact(s) matching the search criteria.`
    };
  })
  .build();
