import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContactBooks = SlateTool.create(spec, {
  name: 'List Contact Books',
  key: 'list_contact_books',
  description: `List contact books the authenticated user has access to. Contact book IDs are needed for listing and creating contacts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().min(1).max(200).optional().describe('Max contact books to return'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      contactBooks: z.array(
        z.object({
          contactBookId: z.string().describe('Contact book ID'),
          name: z.string().optional().describe('Contact book name')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let params: Record<string, string | number> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let data = await client.listContactBooks(params);
    let contactBooks = (data.contact_books || []).map((cb: any) => ({
      contactBookId: cb.id,
      name: cb.name
    }));

    return {
      output: { contactBooks },
      message: `Retrieved **${contactBooks.length}** contact books.`
    };
  })
  .build();
