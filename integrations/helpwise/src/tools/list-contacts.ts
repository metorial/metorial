import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve all contacts from your Helpwise account. Returns contact details including name, email, phone, and associated metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .positive()
        .refine(Number.isSafeInteger)
        .optional()
        .describe('Maximum number of contacts to return'),
      page: z
        .number()
        .positive()
        .refine(Number.isSafeInteger)
        .optional()
        .describe('Page number; converted to offset using limit (20 if omitted)'),
      offset: z
        .number()
        .nonnegative()
        .refine(Number.isSafeInteger)
        .optional()
        .describe('Number of contacts to skip; takes precedence over page')
    })
  )
  .output(
    z.object({
      nextPage: z.boolean().optional().describe('Whether more contacts are available'),
      contacts: z.array(z.record(z.string(), z.any())).describe('List of contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listContacts({
      limit: ctx.input.limit,
      page: ctx.input.page,
      offset: ctx.input.offset
    });

    let contacts = Array.isArray(result)
      ? result
      : (result.results ?? result.contacts ?? result.data?.contacts ?? result.data ?? []);

    return {
      output: { contacts, nextPage: result.nextPage },
      message: `Retrieved ${contacts.length} contact(s).`
    };
  })
  .build();
