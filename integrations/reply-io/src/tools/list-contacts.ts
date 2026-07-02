import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Search and list contacts in your Reply.io account. Filter by email address or LinkedIn profile URL. Supports pagination for large contact lists.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter contacts by email address'),
      linkedIn: z.string().optional().describe('Filter contacts by LinkedIn profile URL'),
      top: z
        .number()
        .optional()
        .describe('Maximum number of contacts to return (default 25, max 1000)'),
      skip: z.number().optional().describe('Number of contacts to skip for pagination')
    })
  )
  .output(
    z.object({
      contacts: z.array(z.record(z.string(), z.any())).describe('List of contacts'),
      total: z.number().optional().describe('Total number of matching contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listContacts({
      email: ctx.input.email,
      linkedIn: ctx.input.linkedIn,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    let contacts = result?.data ?? result?.items ?? (Array.isArray(result) ? result : []);
    let total = result?.pagination?.total ?? result?.total;

    return {
      output: {
        contacts,
        total
      },
      message: `Found **${contacts.length}** contact(s).${total !== undefined ? ` Total: **${total}**.` : ''}`
    };
  })
  .build();
