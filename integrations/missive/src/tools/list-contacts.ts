import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List and search contacts in a contact book. Supports searching by name/email, incremental sync using modifiedSince, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactBookId: z.string().describe('Contact book ID to list contacts from'),
      search: z.string().optional().describe('Search query to filter contacts'),
      modifiedSince: z
        .number()
        .optional()
        .describe(
          'Unix timestamp for incremental sync — returns only contacts modified after this time'
        ),
      includeDeleted: z.boolean().optional().describe('Include deleted contacts'),
      limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .describe('Number of contacts to return (max 200)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.string().describe('Contact ID'),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          middleName: z.string().optional(),
          nickname: z.string().optional(),
          notes: z.string().optional(),
          starred: z.boolean().optional(),
          emails: z.array(z.string()).optional().describe('Email addresses'),
          phoneNumbers: z.array(z.string()).optional().describe('Phone numbers')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let params: Record<string, string | number | boolean> = {
      contact_book: ctx.input.contactBookId
    };

    if (ctx.input.search) params.search = ctx.input.search;
    if (ctx.input.modifiedSince) params.modified_since = ctx.input.modifiedSince;
    if (ctx.input.includeDeleted) params.include_deleted = ctx.input.includeDeleted;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let data = await client.listContacts(params);
    let contacts = (data.contacts || []).map((c: any) => ({
      contactId: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      middleName: c.middle_name,
      nickname: c.nickname,
      notes: c.notes,
      starred: c.starred,
      emails: c.infos?.filter((i: any) => i.type === 'email').map((i: any) => i.address),
      phoneNumbers: c.infos
        ?.filter((i: any) => i.type === 'phone_number')
        .map((i: any) => i.phone_number)
    }));

    return {
      output: { contacts },
      message: `Retrieved **${contacts.length}** contacts.`
    };
  })
  .build();
