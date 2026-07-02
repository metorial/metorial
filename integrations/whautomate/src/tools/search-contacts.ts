import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search and retrieve contacts. Supports filtering by free-text search, channel, location, tags, and stage. Use this to find contacts or get a specific contact by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z
        .string()
        .optional()
        .describe('Get a specific contact by ID. If provided, other filters are ignored.'),
      search: z.string().optional().describe('Free-text search across contact fields'),
      channel: z
        .string()
        .optional()
        .describe('Filter by channel (whatsapp, instagram, telegram, messenger)'),
      locationId: z.string().optional().describe('Filter by location ID'),
      tags: z.string().optional().describe('Filter by tags (comma-separated)'),
      stage: z.string().optional().describe('Filter by stage (e.g., Subscriber, Lead)'),
      page: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      contacts: z.array(z.record(z.string(), z.any())).describe('Array of contact records'),
      totalCount: z.number().optional().describe('Total number of matching contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    if (ctx.input.contactId) {
      let result = await client.getContact(ctx.input.contactId);
      return {
        output: {
          contacts: [result],
          totalCount: 1
        },
        message: `Found contact **${result.name || ctx.input.contactId}**.`
      };
    }

    let result = await client.searchContacts({
      search: ctx.input.search,
      channel: ctx.input.channel,
      locationId: ctx.input.locationId,
      tags: ctx.input.tags,
      stage: ctx.input.stage,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let contacts = Array.isArray(result) ? result : result.contacts || result.data || [];
    let totalCount = result.totalCount || result.total || contacts.length;

    return {
      output: {
        contacts,
        totalCount
      },
      message: `Found **${totalCount}** contact(s).`
    };
  })
  .build();
