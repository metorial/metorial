import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search for contacts using keyword search or advanced filters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Full-text search query'),
      filters: z.any().optional().describe('Advanced filter object'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page (max: 100)')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.string().describe('Contact ID'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            title: z.string().optional().describe('Job title'),
            isHot: z.boolean().optional().describe('Whether hot')
          })
        )
        .describe('Matching contacts'),
      totalCount: z.number().optional().describe('Total results'),
      currentPage: z.number().optional().describe('Current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: any;
    if (ctx.input.filters) {
      data = await client.filterContacts(ctx.input.filters, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
    } else {
      data = await client.searchContacts(ctx.input.query ?? '', {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
    }

    let contacts = (data?._embedded?.contacts ?? []).map((c: any) => ({
      contactId: c.id?.toString() ?? '',
      firstName: c.first_name,
      lastName: c.last_name,
      title: c.title,
      isHot: c.is_hot
    }));

    return {
      output: {
        contacts,
        totalCount: data?.total ?? contacts.length,
        currentPage: data?.page ?? ctx.input.page ?? 1
      },
      message: `Found **${contacts.length}** contact(s).`
    };
  })
  .build();
