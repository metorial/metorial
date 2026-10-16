import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, inputId } from '../lib/client';
import { contactOutput, mapContact, pageInput, pageOutput } from '../lib/schemas';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve a page of recipient contacts from your EchtPost account. Filter by name/address search, country, group, or external reference. Returns contact IDs for sending postcards.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...pageInput,
      search: z.string().optional().describe('Search contacts'),
      countryCode: z.string().optional().describe('Filter by two-letter country code'),
      groupId: z.string().optional().describe('Filter by group ID'),
      externalId: z.string().optional().describe('Filter by external reference'),
      sort: z
        .enum(['last_name', 'created_at', 'updated_at'])
        .optional()
        .describe('Sort field'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      include: z
        .array(z.enum(['groups', 'cards']))
        .optional()
        .describe('Include related group or card IDs')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactOutput).describe('List of recipient contacts'),
      ...pageOutput
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info('Fetching contacts');

    let { groupId, ...input } = ctx.input;
    let result = await client.list('/contacts', {
      page: input.page,
      per_page: input.perPage,
      search: input.search,
      country_code: input.countryCode,
      group_id: groupId === undefined ? undefined : inputId(groupId, 'groupId'),
      external_id: input.externalId,
      sort: input.sort,
      direction: input.direction,
      include: input.include?.join(',')
    });
    let mapped = result.items.map(mapContact);

    return {
      output: {
        contacts: mapped,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        links: result.links
      },
      message: `Found **${mapped.length}** contact(s).`
    };
  })
  .build();
