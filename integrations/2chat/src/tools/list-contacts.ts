import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description:
    'Browse a page of contacts in your 2Chat account, optionally limited to a connected WhatsApp channel.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      channelUuid: z
        .string()
        .optional()
        .describe('Connected number UUID from List WhatsApp Numbers'),
      page: z.number().int().min(0).optional().describe('Zero-based page number, default 0'),
      resultsPerPage: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Contacts per page, from 1 to 100; default 50')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Contacts with uuid, names and detail values'),
      page: z.number().optional().describe('Page returned by 2Chat'),
      count: z.number().optional().describe('Number of contacts returned')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new TwoChatClient({ token: ctx.auth.token }).listContacts(ctx.input);
    let contacts = result.contacts ?? [];
    return {
      output: { contacts, page: result.page ?? undefined, count: result.count ?? undefined },
      message: `Retrieved **${contacts.length}** contact(s).`
    };
  })
  .build();
