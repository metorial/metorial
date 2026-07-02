import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieves contacts from SuiteDash CRM. Returns a paginated list of contacts. Specify a page number to navigate through results, or fetch all contacts at once.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .optional()
        .describe('Page number to retrieve (starts at 1). If omitted, returns all contacts.')
    })
  )
  .output(
    z.object({
      contacts: z.array(z.record(z.string(), z.unknown())).describe('List of contact records'),
      totalPages: z.number().optional().describe('Total number of pages available'),
      total: z.number().optional().describe('Total number of contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicId: ctx.auth.publicId,
      secretKey: ctx.auth.secretKey
    });

    if (ctx.input.page !== undefined) {
      let response = await client.listContacts(ctx.input.page);
      return {
        output: {
          contacts: response.data,
          totalPages: response.meta?.pagination?.totalPages,
          total: response.meta?.pagination?.total
        },
        message: `Retrieved **${response.data.length}** contacts (page ${ctx.input.page} of ${response.meta?.pagination?.totalPages ?? 1}).`
      };
    }

    let contacts = await client.listAllContacts();
    return {
      output: {
        contacts,
        totalPages: undefined,
        total: contacts.length
      },
      message: `Retrieved all **${contacts.length}** contacts.`
    };
  })
  .build();
