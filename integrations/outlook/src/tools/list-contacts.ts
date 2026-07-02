import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { optionalEmailAddresses, optionalString } from '../lib/output';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List contacts from the authenticated user's contact book. Supports filtering by folder, searching by keyword, and pagination. Returns contact summary information.`,
  instructions: [
    'Use **search** for full-text search across contact fields.',
    "Use **filter** for OData queries like `companyName eq 'Contoso'`."
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Contact folder ID to list contacts from'),
      search: z.string().optional().describe('Full-text search query'),
      filter: z.string().optional().describe('OData filter expression'),
      orderby: z
        .string()
        .optional()
        .describe('OData orderby expression (e.g., "displayName asc")'),
      top: z.number().optional().describe('Maximum number of contacts to return'),
      skip: z.number().optional().describe('Number of contacts to skip for pagination')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.string(),
          displayName: z.string().optional(),
          givenName: z.string().optional(),
          surname: z.string().optional(),
          emailAddresses: z
            .array(
              z.object({
                address: z.string(),
                name: z.string().optional()
              })
            )
            .optional(),
          businessPhones: z.array(z.string()).optional(),
          mobilePhone: z.string().optional(),
          jobTitle: z.string().optional(),
          companyName: z.string().optional(),
          department: z.string().optional(),
          categories: z.array(z.string()).optional()
        })
      ),
      nextPageAvailable: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listContacts({
      folderId: ctx.input.folderId,
      search: ctx.input.search,
      filter: ctx.input.filter,
      orderby: ctx.input.orderby,
      top: ctx.input.top || 25,
      skip: ctx.input.skip
    });

    let contacts = result.value.map(c => ({
      contactId: c.id,
      displayName: c.displayName,
      givenName: c.givenName,
      surname: c.surname,
      emailAddresses: optionalEmailAddresses(c.emailAddresses),
      businessPhones: c.businessPhones,
      mobilePhone: optionalString(c.mobilePhone),
      jobTitle: optionalString(c.jobTitle),
      companyName: optionalString(c.companyName),
      department: optionalString(c.department),
      categories: c.categories
    }));

    return {
      output: {
        contacts,
        nextPageAvailable: !!result['@odata.nextLink']
      },
      message: `Found **${contacts.length}** contact(s).`
    };
  })
  .build();
